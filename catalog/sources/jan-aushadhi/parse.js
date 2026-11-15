'use strict';

const { lineText } = require('../../lib/pdftable');

/**
 * Parse the PMBJP annexure ("The list of N generic medicines under PMBJP till <date>"):
 * columns S. No. | Drug Code | Generic Name of Item | Unit Size, header repeated per page,
 * long names wrapping onto continuation lines.
 *
 * Column boundaries come from each page's own header item positions. Self-checks:
 * the row count must equal N from the title and serial numbers must run 1..N.
 */
function parseAnnexure(pages) {
  const rows = [];
  let expected = null;
  let asOf = null;
  let cols = null;
  let current = null;
  const problems = [];

  const flush = () => {
    if (current) rows.push(current);
    current = null;
  };

  for (const page of pages) {
    for (const line of page.lines) {
      const text = lineText(line);
      const title = text.match(
        /list of (\d+) generic medicines under PMBJP till ([\d.]+)/i
      );
      if (title) {
        expected = Number(title[1]);
        asOf = title[2];
        continue;
      }
      if (/Release ID/i.test(text)) {
        flush();
        return finish();
      }
      const generic = line.items.find((i) => /^Generic/i.test(i.str.trim()));
      const unit = line.items.find((i) => /^Unit/i.test(i.str.trim()));
      if (generic && unit) {
        const drug = line.items.find((i) => /^Drug/i.test(i.str.trim()));
        cols = {
          code: drug ? drug.x - 4 : generic.x - 40,
          name: generic.x - 4,
          unit: unit.x - 4,
        };
        continue;
      }
      if (!cols || /^Code$/i.test(text) || /^Annexure$/i.test(text)) continue;

      const cell = { sno: [], code: [], name: [], unit: [] };
      for (const it of line.items) {
        const col =
          it.x < cols.code
            ? 'sno'
            : it.x < cols.name
            ? 'code'
            : it.x < cols.unit
            ? 'name'
            : 'unit';
        cell[col].push(it.str.trim());
      }
      const sno = cell.sno.join(' ').trim();
      if (/^\d+$/.test(sno)) {
        flush();
        current = {
          sno: Number(sno),
          code: cell.code.join(' ').trim(),
          name: cell.name.join(' ').trim(),
          unit: cell.unit.join(' ').trim(),
          page: page.number,
        };
      } else if (current && !sno) {
        if (cell.name.length)
          current.name = `${current.name} ${cell.name.join(' ')}`.trim();
        if (cell.unit.length)
          current.unit = `${current.unit} ${cell.unit.join(' ')}`.trim();
        if (cell.code.length)
          problems.push({
            page: page.number,
            text,
            problem: 'text in code column on a continuation line',
          });
      } else if (text) {
        problems.push({
          page: page.number,
          text,
          problem: 'unrecognised line',
        });
      }
    }
  }
  flush();
  return finish();

  // Rows numbered above the stated count are real entries added to the table later (the
  // 31.12.2025 list has "2111 Insulin Pen" between 816 and 817): keep them, report them.
  function finish() {
    const errors = [];
    if (expected === null)
      errors.push('title with the expected row count not found');
    const numbered =
      expected === null ? rows : rows.filter((r) => r.sno <= expected);
    const extras =
      expected === null ? [] : rows.filter((r) => r.sno > expected);
    if (expected !== null && numbered.length !== expected) {
      errors.push(
        `parsed ${numbered.length} rows numbered 1..${expected}, title says ${expected}`
      );
    }
    numbered.forEach((r, i) => {
      if (r.sno !== i + 1) errors.push(`serial ${r.sno} at position ${i + 1}`);
    });
    return { rows, expected, asOf, extras, problems, errors };
  }
}

module.exports = { parseAnnexure };
