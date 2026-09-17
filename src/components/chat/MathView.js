import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import katex from 'katex';
import { latexFallback } from './math';

function mathHtml(latex, { display, color }) {
  let rendered = '';
  try {
    rendered = katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
      strict: 'ignore',
      trust: true,
    });
  } catch {
    rendered = `<span>${latexFallback(latex)}</span>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
    }
    body {
      color: ${color};
      display: ${display ? 'block' : 'inline-block'};
    }
    .katex { font-size: ${display ? '1.12em' : '1.02em'}; color: ${color}; }
    .katex-display { margin: 0.2em 0; }
  </style>
</head>
<body>
  ${rendered}
  <script>
    function report() {
      const body = document.body;
      const width = Math.ceil(Math.max(body.scrollWidth, body.offsetWidth, 24));
      const height = Math.ceil(Math.max(body.scrollHeight, body.offsetHeight, 22));
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ width: width, height: height }));
      }
    }
    window.addEventListener('load', report);
    setTimeout(report, 40);
    setTimeout(report, 180);
  </script>
</body>
</html>`;
}

export default function MathView({ latex, display = false, color = '#1A2332' }) {
  const [size, setSize] = useState({
    width: display ? '100%' : Math.min(220, 18 + String(latex || '').length * 9),
    height: display ? 48 : 28,
  });

  const html = useMemo(
    () => mathHtml(String(latex || '').trim(), { display, color }),
    [latex, display, color]
  );

  if (!String(latex || '').trim()) return null;

  return (
    <View style={[styles.wrap, display ? styles.display : styles.inline, { height: size.height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        automaticallyAdjustContentInsets={false}
        scalesPageToFit={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        pointerEvents="none"
        style={[
          styles.web,
          display ? { width: '100%', height: size.height } : { width: size.width, height: size.height },
        ]}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            const nextHeight = Math.max(display ? 36 : 22, Math.min(220, Number(payload.height) || 0));
            const nextWidth = display
              ? '100%'
              : Math.max(28, Math.min(280, Number(payload.width) || 0));
            setSize({ width: nextWidth, height: nextHeight });
          } catch {
            /* ignore */
          }
        }}
        renderError={() => (
          <Text style={[styles.fallback, { color }]}>{latexFallback(latex)}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  display: { width: '100%', marginVertical: 6 },
  inline: { marginHorizontal: 2, justifyContent: 'center' },
  web: { backgroundColor: 'transparent' },
  fallback: { fontSize: 15, lineHeight: 22 },
});
