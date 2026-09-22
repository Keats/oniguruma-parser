import type {AlternativeElementNode, AlternativeNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer} from '../../parser/node-utils.js';
import {createAlternative, createGroup} from '../../parser/parse.js';
import {isAllowedSimpleNode, isNodeEqual} from './extract-prefix.js';

/**
Extract alternating suffixes if patterns are repeated for each suffix.
Ex: `a$|a!|bb$|bb!|c$|c!` -> `(?:a|bb|c)(?:$|!)`.
Also works within groups.
*/
const extractSuffix2: Visitor = {
  '*'({node}) {
    if (!isAlternativeContainer(node)) {
      return;
    }
    const numDiffSuffixes = 2;
    const numAlts = node.body.length;
    if (numAlts < (numDiffSuffixes * 2) || numAlts % numDiffSuffixes) {
      return;
    }
    const suffixAltElsByI = [...node.body.slice(0, numDiffSuffixes).map(alt => alt.body)];
    const suffixNodesByI = Array.from({length: numDiffSuffixes}, (): Array<AlternativeElementNode> => []);
    const suffixIsFinishedByI = Array(numDiffSuffixes).fill(false);
    const longestOf = Math.max(...suffixAltElsByI.map(els => els.length));
    for (let nodeI = 0; nodeI < longestOf; nodeI++) {
      for (let suffixI = 0; suffixI < numDiffSuffixes; suffixI++) {
        if (!suffixIsFinishedByI[suffixI]) {
          const suffixAltEls = suffixAltElsByI[suffixI];
          const inverseI = suffixAltEls.length - 1 - nodeI;
          const nextNode = suffixAltEls[inverseI];
          if (
            !nextNode ||
            !isAllowedSimpleNode(nextNode) ||
            !isSuffixNodeShared(nextNode, node.body, suffixI, nodeI, numDiffSuffixes)
          ) {
            suffixIsFinishedByI[suffixI] = true;
          } else {
            suffixNodesByI[suffixI].push(nextNode);
          }
        }
      }
    }
    if (!suffixNodesByI.some(nodes => nodes.length)) {
      return;
    }
    suffixNodesByI.forEach(nodes => nodes.reverse());
    const strippedAlts = [];
    let counter = 0;
    for (let i = 0; i < numAlts; i++) {
      const numSuffixNodes = suffixNodesByI[counter].length;
      strippedAlts.push(createAlternative({
        body: numSuffixNodes ? node.body[i].body.slice(0, -numSuffixNodes) : [...node.body[i].body],
      }));
      counter = counter < (numDiffSuffixes - 1) ? counter + 1 : 0;
    }
    // Check that each set of alts now use the same value after having had their suffixes removed
    for (let i = 0; i < (numAlts / numDiffSuffixes); i++) {
      const altComparisonSet = strippedAlts.slice(i * numDiffSuffixes, (i * numDiffSuffixes) + numDiffSuffixes);
      for (let j = 1; j < altComparisonSet.length; j++) {
        const els = altComparisonSet[j].body;
        if (els.length !== altComparisonSet[0].body.length) {
          return;
        }
        if (!els.every((el, k) => (
          isAllowedSimpleNode(el) &&
          isNodeEqual(el, altComparisonSet[0].body[k])
        ))) {
          return;
        }
      }
    }
    const suffixAlts = [];
    for (let i = 0; i < numDiffSuffixes; i++) {
      suffixAlts.push(createAlternative({body: suffixNodesByI[i]}));
    }
    const suffixGroup = createGroup({body: suffixAlts});
    const newContentsAlt = createAlternative();
    // Only take one (unique) alt from each set of stripped alts
    const prefixGroup = createGroup({body: strippedAlts.filter((_, i) => i % numDiffSuffixes)});
    if (prefixGroup.body.every(alt => !alt.body.length)) {
      node.body = suffixGroup.body;
    } else {
      newContentsAlt.body.push(prefixGroup, suffixGroup);
      node.body = [newContentsAlt];
    }
  },
};

function isSuffixNodeShared(
  node: AlternativeElementNode,
  alts: Array<AlternativeNode>,
  suffixI: number,
  nodeI: number,
  numDiffSuffixes: number
): boolean {
  for (let i = suffixI; i < alts.length; i += numDiffSuffixes) {
    const alt = alts[i];
    const inverseIOfAlt = alt.body.length - 1 - nodeI;
    const bNode = alt.body[inverseIOfAlt];
    if (!bNode || !isNodeEqual(bNode, node)) {
      return false;
    }
  }
  return true;
}

export {
  extractSuffix2,
};
