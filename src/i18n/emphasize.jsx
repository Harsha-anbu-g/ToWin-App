// One sentence, one highlighted part, any word order.
//
// A heading like "How trust grows" with "trust" in gold used to be three
// separate pieces of text, which cannot be translated: French and Tamil put the
// highlighted word somewhere else in the sentence. The sentence is translated
// whole instead, with the highlighted parts between asterisks, and drawn here:
//   emphasize(tr('How *trust* grows'), { color: t.trustGold })
import { Text } from 'react-native';

export default function emphasize(sentence, style) {
  return String(sentence)
    .split('*')
    .map((part, i) =>
      i % 2 === 1 ? (
        <Text key={i} style={style}>
          {part}
        </Text>
      ) : (
        part
      )
    );
}
