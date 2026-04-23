#!/usr/bin/env node
// Context + session usage statusline for Claude Code.
// Output:
//   <model> │ <dir> | <user>'s context  <bar> <pct>%  │  session  <bar> <pct>% · resets <HH:MMam/pm>

const path = require('path');

const stdinTimeout = setTimeout(() => process.exit(0), 3000);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);

    const model = data.model?.display_name || 'Claude';
    const cwd = data.workspace?.current_dir || data.cwd || '';
    const dir = cwd ? path.basename(cwd) : '';
    const user = process.env.USER || process.env.LOGNAME || 'user';

    // Context: normalize against Claude Code's ~16.5% auto-compact reservation
    // so 100% = the point where auto-compact kicks in.
    const remainingCtx =
      data.context_window?.remaining_percentage ??
      data.context?.remaining_percentage ??
      data.contextWindow?.remainingPercentage ??
      null;

    let ctxUsed = null;
    if (remainingCtx != null) {
      const AUTO_COMPACT_BUFFER_PCT = 16.5;
      const usableRemaining = Math.max(
        0,
        ((remainingCtx - AUTO_COMPACT_BUFFER_PCT) / (100 - AUTO_COMPACT_BUFFER_PCT)) * 100
      );
      ctxUsed = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));
    }

    // 5-hour session usage comes pre-normalized (0-100) from CC; use raw value.
    const fiveHour = data.rate_limits?.five_hour;
    let sessionUsed = null;
    let sessionResetsAt = null;
    if (fiveHour && fiveHour.used_percentage != null) {
      sessionUsed = Math.max(0, Math.min(100, Math.round(fiveHour.used_percentage)));
      if (fiveHour.resets_at) sessionResetsAt = fiveHour.resets_at;
    }

    function renderBar(usedPct) {
      const filled = Math.floor(usedPct / 10);
      const filledBar = '▇'.repeat(filled);
      const emptyBar = '▇'.repeat(10 - filled);
      let bright, dim;
      if (usedPct < 50) { bright = '\x1b[38;5;110m'; dim = '\x1b[38;5;67m'; }
      else if (usedPct < 65) { bright = '\x1b[38;5;108m'; dim = '\x1b[38;5;65m'; }
      else if (usedPct < 80) { bright = '\x1b[38;5;173m'; dim = '\x1b[38;5;130m'; }
      else { bright = '\x1b[38;5;174m'; dim = '\x1b[38;5;131m'; }
      return `${bright}${filledBar}\x1b[0m${dim}${emptyBar}\x1b[0m ${bright}${usedPct}%\x1b[0m`;
    }

    function formatResetTime(unixSec) {
      const d = new Date(unixSec * 1000);
      const fmt = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return fmt.format(d).replace(/\s/g, '').toLowerCase();
    }

    let out = `\x1b[2m${model}\x1b[0m`;
    if (dir) out += ` \x1b[2m│\x1b[0m \x1b[2m${dir}\x1b[0m`;

    if (ctxUsed != null) {
      out += ` \x1b[2m| ${user}'s context\x1b[0m  ${renderBar(ctxUsed)}`;
    }

    if (sessionUsed != null) {
      let sessionBlock = `  \x1b[2m│\x1b[0m  \x1b[2msession\x1b[0m  ${renderBar(sessionUsed)}`;
      if (sessionResetsAt) {
        sessionBlock += `\x1b[2m · resets ${formatResetTime(sessionResetsAt)}\x1b[0m`;
      }
      out += sessionBlock;
    }

    process.stdout.write(out);
  } catch (_) {
    // Silent fail — keep statusline from breaking on parse errors
  }
});
