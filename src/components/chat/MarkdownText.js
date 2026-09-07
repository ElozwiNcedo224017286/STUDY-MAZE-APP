import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../theme/colors';
import { splitMarkdownAndMath } from './math';
import MathView from './MathView';

export default function MarkdownText({ text, isUser = false }) {
  if (!text) return null;

  const textColor = isUser ? COLORS.white : COLORS.textPrimary;
  const baseText = { fontSize: 15, lineHeight: 22, color: textColor };

  const parseInline = (line, style, keyPrefix = '') => {
    const parts = [];
    const re = /(`(.+?)`)|(\*\*(.+?)\*\*)|((?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;
    let lastIndex = 0;
    let k = 0;
    let match;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`${keyPrefix}t${k++}`} style={style}>
            {line.slice(lastIndex, match.index)}
          </Text>
        );
      }
      if (match[1]) {
        parts.push(
          <Text key={`${keyPrefix}c${k++}`} style={[style, styles.code, isUser && styles.codeUser]}>
            {match[2]}
          </Text>
        );
      } else if (match[3]) {
        parts.push(
          <Text key={`${keyPrefix}b${k++}`} style={[style, { fontWeight: '700' }]}>
            {match[4]}
          </Text>
        );
      } else if (match[5]) {
        parts.push(
          <Text key={`${keyPrefix}i${k++}`} style={[style, { fontStyle: 'italic' }]}>
            {match[6]}
          </Text>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(
        <Text key={`${keyPrefix}t${k++}`} style={style}>
          {line.slice(lastIndex)}
        </Text>
      );
    }
    return parts.length ? <Text style={style}>{parts}</Text> : <Text style={style}>{line}</Text>;
  };

  const renderTextBlock = (block, keyPrefix) => {
    const lines = String(block || '').split('\n');
    const elements = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      if (trimmed.startsWith('```')) {
        const codeLines = [];
        i += 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i += 1;
        }
        i += 1;
        elements.push(
          <View key={`${keyPrefix}cb${key++}`} style={styles.codeBlock}>
            <Text style={[baseText, styles.codeBlockText]}>{codeLines.join('\n')}</Text>
          </View>
        );
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const sizes = { 1: 18, 2: 16, 3: 15 };
        const size = sizes[headingMatch[1].length];
        elements.push(
          <View key={`${keyPrefix}h${key++}`} style={styles.heading}>
            {parseInline(headingMatch[2], { ...baseText, fontSize: size, fontWeight: '800', lineHeight: size + 6 })}
          </View>
        );
        i += 1;
        continue;
      }

      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        elements.push(
          <View key={`${keyPrefix}li${key++}`} style={styles.listRow}>
            <Text style={[baseText, styles.bullet]}>{'\u2022'}</Text>
            <View style={styles.listContent}>{parseInline(bulletMatch[1], baseText, `${keyPrefix}li${key}`)}</View>
          </View>
        );
        i += 1;
        continue;
      }

      const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      if (numMatch) {
        elements.push(
          <View key={`${keyPrefix}ol${key++}`} style={styles.listRow}>
            <Text style={[baseText, styles.num]}>{numMatch[1]}.</Text>
            <View style={styles.listContent}>{parseInline(numMatch[2], baseText, `${keyPrefix}ol${key}`)}</View>
          </View>
        );
        i += 1;
        continue;
      }

      if (trimmed === '') {
        elements.push(<View key={`${keyPrefix}sp${key++}`} style={styles.spacer} />);
        i += 1;
        continue;
      }

      elements.push(
        <View key={`${keyPrefix}p${key++}`} style={styles.paragraph}>
          {parseInline(trimmed, baseText, `${keyPrefix}p${key}`)}
        </View>
      );
      i += 1;
    }

    return elements;
  };

  const renderMixedLine = (pieces, keyPrefix) => (
    <View key={keyPrefix} style={styles.inlineRow}>
      {pieces.map((piece, index) => {
        if (piece.type === 'inline-math') {
          return <MathView key={`${keyPrefix}m${index}`} latex={piece.value} color={textColor} />;
        }
        const value = String(piece.value || '');
        if (!value.trim()) return null;
        return (
          <View key={`${keyPrefix}t${index}`}>
            {parseInline(value, baseText, `${keyPrefix}${index}`)}
          </View>
        );
      })}
    </View>
  );

  const renderChunk = (chunk, keyPrefix) => {
    const hasMath = chunk.some((token) => token.type === 'inline-math');
    if (!hasMath) {
      return renderTextBlock(chunk.map((token) => token.value).join(''), keyPrefix);
    }

    const lines = [[]];
    chunk.forEach((token) => {
      if (token.type === 'inline-math') {
        lines[lines.length - 1].push(token);
        return;
      }
      String(token.value || '').split('\n').forEach((part, partIndex, parts) => {
        if (part) lines[lines.length - 1].push({ type: 'text', value: part });
        if (partIndex < parts.length - 1) lines.push([]);
      });
    });

    return lines.map((line, lineIndex) => {
      if (!line.length) return <View key={`${keyPrefix}sp${lineIndex}`} style={styles.spacer} />;
      if (line.every((piece) => piece.type === 'text')) {
        return <View key={`${keyPrefix}t${lineIndex}`}>{renderTextBlock(line.map((piece) => piece.value).join(''), `${keyPrefix}${lineIndex}`)}</View>;
      }
      return renderMixedLine(line, `${keyPrefix}m${lineIndex}`);
    });
  };

  const tokens = splitMarkdownAndMath(text);
  const elements = [];
  let index = 0;
  let block = 0;

  while (index < tokens.length) {
    if (tokens[index].type === 'display-math') {
      elements.push(
        <MathView
          key={`d${block++}`}
          latex={tokens[index].value}
          display
          color={textColor}
        />
      );
      index += 1;
      continue;
    }

    const chunk = [];
    while (index < tokens.length && tokens[index].type !== 'display-math') {
      chunk.push(tokens[index]);
      index += 1;
    }
    elements.push(...renderChunk(chunk, `c${block++}`));
  }

  return <View style={styles.container}>{elements}</View>;
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  paragraph: { marginVertical: 2 },
  heading: { marginTop: 8, marginBottom: 3 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 1 },
  bullet: { width: 16, textAlign: 'center' },
  num: { width: 22, textAlign: 'right', marginRight: 4 },
  listContent: { flex: 1 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginVertical: 2 },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(109, 40, 217, 0.08)',
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 13,
  },
  codeUser: { backgroundColor: 'rgba(255,255,255,0.18)' },
  codeBlock: {
    backgroundColor: 'rgba(26, 16, 48, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  spacer: { height: 6 },
});
