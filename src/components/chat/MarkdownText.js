import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../theme/colors';

export default function MarkdownText({ text, isUser = false }) {
  if (!text) return null;

  const textColor = isUser ? COLORS.white : COLORS.textPrimary;
  const parseInline = (line, baseStyle, keyPrefix = '') => {
    const parts = [];
    const re = /(`(.+?)`)|(\*\*(.+?)\*\*)|((?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;
    let lastIndex = 0;
    let k = 0;
    let match;

    while ((match = re.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`${keyPrefix}t${k++}`} style={baseStyle}>
            {line.slice(lastIndex, match.index)}
          </Text>
        );
      }
      if (match[1]) {
        parts.push(
          <Text key={`${keyPrefix}c${k++}`} style={[baseStyle, styles.code, isUser && styles.codeUser]}>
            {match[2]}
          </Text>
        );
      } else if (match[3]) {
        parts.push(
          <Text key={`${keyPrefix}b${k++}`} style={[baseStyle, { fontWeight: '700' }]}>
            {match[4]}
          </Text>
        );
      } else if (match[5]) {
        parts.push(
          <Text key={`${keyPrefix}i${k++}`} style={[baseStyle, { fontStyle: 'italic' }]}>
            {match[6]}
          </Text>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(
        <Text key={`${keyPrefix}t${k++}`} style={baseStyle}>
          {line.slice(lastIndex)}
        </Text>
      );
    }
    return parts.length ? <Text style={baseStyle}>{parts}</Text> : <Text style={baseStyle}>{line}</Text>;
  };

  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;
  const baseText = { fontSize: 15, lineHeight: 22, color: textColor };

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
        <View key={`cb${key++}`} style={styles.codeBlock}>
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
        <View key={`h${key++}`} style={styles.heading}>
          {parseInline(headingMatch[2], { ...baseText, fontSize: size, fontWeight: '800', lineHeight: size + 6 })}
        </View>
      );
      i += 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      elements.push(
        <View key={`li${key++}`} style={styles.listRow}>
          <Text style={[baseText, styles.bullet]}>{'\u2022'}</Text>
          <View style={styles.listContent}>{parseInline(bulletMatch[1], baseText, `li${key}`)}</View>
        </View>
      );
      i += 1;
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numMatch) {
      elements.push(
        <View key={`ol${key++}`} style={styles.listRow}>
          <Text style={[baseText, styles.num]}>{numMatch[1]}.</Text>
          <View style={styles.listContent}>{parseInline(numMatch[2], baseText, `ol${key}`)}</View>
        </View>
      );
      i += 1;
      continue;
    }

    if (trimmed === '') {
      elements.push(<View key={`sp${key++}`} style={styles.spacer} />);
      i += 1;
      continue;
    }

    elements.push(
      <View key={`p${key++}`} style={styles.paragraph}>
        {parseInline(trimmed, baseText, `p${key}`)}
      </View>
    );
    i += 1;
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
