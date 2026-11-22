import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { formatMoney, formatMoneyFull } from './metrics';

// Chart colours come from the dashboard CSS variables (palette slots 1-2, light/dark).
// Marks: bars <= 24px with 4px rounded data-ends on the baseline, 2px lines, hairline grid.

/** Width of an element, kept live with ResizeObserver (falls back to window resize). */
export const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return [ref, width];
};

// "Nice" axis maximum and ticks (0, step, 2*step ...)
export const niceScale = (maxValue, tickCount = 4) => {
  if (!maxValue || maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / tickCount;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const max = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { max, ticks };
};

// Bar with rounded top corners only (baseline stays square)
const topRoundedBar = (x, y, w, h, r) => {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
};

/** Floating tooltip shown on hover or keyboard focus. */
const Tip = ({ tip }) => {
  if (!tip) return null;
  return (
    <div className="rq-dash-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <div className="rq-dash-tip-title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.label} className="rq-dash-tip-row">
          <span>{r.label}</span>
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  );
};

Tip.propTypes = {
  tip: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    title: PropTypes.string,
    rows: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.string })),
  }),
};

/** Daily sales as bars (single axis). Hover or focus a day for orders / cancellations. */
export const TrendChart = ({ series, height = 220 }) => {
  const [ref, width] = useElementWidth();
  const [tip, setTip] = useState(null);
  const plotLeft = 52;
  const plotBottom = 26;
  const plotTop = 12;
  const innerH = height - plotTop - plotBottom;
  const innerW = Math.max(0, width - plotLeft - 8);
  const peak = Math.max(0, ...series.map((d) => d.sales));
  const { max, ticks } = niceScale(peak);
  const band = series.length ? innerW / series.length : 0;
  const barW = Math.min(24, Math.max(2, band * 0.66));
  const labelEvery = series.length > 14 ? Math.ceil(series.length / 6) : 1;

  const show = (i, cx) => {
    const d = series[i];
    setTip({
      x: Math.min(Math.max(cx, 60), Math.max(60, width - 150)),
      y: 0,
      title: d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      rows: [
        { label: 'Sales', value: formatMoneyFull(d.sales) },
        { label: 'Orders', value: String(d.orders) },
        { label: 'Cancelled', value: String(d.cancelled) },
      ],
    });
  };

  return (
    <div className="rq-dash-trend" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Daily sales for the selected period">
          {ticks.map((t) => {
            const y = plotTop + innerH - (t / max) * innerH;
            return (
              <g key={t}>
                <line x1={plotLeft} x2={width - 8} y1={y} y2={y} className="rq-dash-gridline" />
                <text x={plotLeft - 8} y={y + 4} textAnchor="end" className="rq-dash-axis">
                  {t === 0 ? '0' : formatMoney(t)}
                </text>
              </g>
            );
          })}
          <line x1={plotLeft} x2={width - 8} y1={plotTop + innerH} y2={plotTop + innerH} className="rq-dash-baseline" />
          {series.map((d, i) => {
            const cx = plotLeft + band * i + band / 2;
            const h = (d.sales / max) * innerH;
            const y = plotTop + innerH - h;
            const isPeak = d.sales > 0 && d.sales === peak;
            return (
              <g key={d.key}>
                {/* full-band hit area: bigger than the bar, so hover is easy */}
                <rect
                  x={plotLeft + band * i}
                  y={plotTop}
                  width={band}
                  height={innerH + plotBottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.date.toDateString()}: ${formatMoneyFull(d.sales)}, ${d.orders} orders`}
                  onMouseEnter={() => show(i, cx)}
                  onFocus={() => show(i, cx)}
                  onMouseLeave={() => setTip(null)}
                  onBlur={() => setTip(null)}
                  className="rq-dash-hit"
                />
                {h > 0 && <path d={topRoundedBar(cx - barW / 2, y, barW, h, 4)} className={`rq-dash-bar${isPeak ? ' is-peak' : ''}`} />}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="rq-dash-axis">
                    {d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <Tip tip={tip} />
    </div>
  );
};

TrendChart.propTypes = {
  series: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      date: PropTypes.instanceOf(Date),
      sales: PropTypes.number,
      orders: PropTypes.number,
      cancelled: PropTypes.number,
    })
  ).isRequired,
  height: PropTypes.number,
};

/** Ranked horizontal bars with the value at the bar end. Bars are capped at 24px. */
export const RankBars = ({ rows, emptyText }) => {
  if (!rows.length) return <div className="rq-dash-muted">{emptyText}</div>;
  const peak = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="rq-dash-rank" aria-label="Ranking">
      {rows.map((r) => (
        <li key={r.key} className={`rq-dash-rank-row${r.tone === 'bad' ? ' is-bad' : ''}`}>
          <div className="rq-dash-rank-head">
            <span className="rq-dash-rank-label">{r.label}</span>
            <span className="rq-dash-rank-value">{r.display}</span>
          </div>
          <div className="rq-dash-rank-track" aria-hidden="true">
            <div
              className="rq-dash-rank-bar"
              style={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / peak) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

RankBars.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      display: PropTypes.string,
      tone: PropTypes.string,
    })
  ).isRequired,
  emptyText: PropTypes.string,
};

RankBars.defaultProps = { emptyText: 'No data for this period' };

const SEGMENT_COLORS = ['var(--rq-series-1)', 'var(--rq-series-2)', 'var(--rq-series-3)'];

/** One whole split into parts (tall segmented bar). Legend names each part; blocks carry their share. */
export const SegmentBar = ({ parts }) => {
  const total = parts.reduce((acc, p) => acc + p.value, 0);
  if (!total) return <div className="rq-dash-muted">No orders in this period</div>;
  return (
    <div className="rq-dash-segment">
      <div className="rq-dash-segment-bar" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        {parts.map((p, i) => {
          const share = p.value / total;
          return p.value > 0 ? (
            <div
              key={p.key}
              className="rq-dash-segment-part"
              title={`${p.label}: ${p.value} orders (${Math.round(share * 100)}%)`}
              style={{ width: `${share * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            >
              {share >= 0.18 && <span>{Math.round(share * 100)}%</span>}
            </div>
          ) : null;
        })}
      </div>
      <ul className="rq-dash-legend">
        {parts.map((p, i) => (
          <li key={p.key}>
            <span className="rq-dash-swatch" style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} aria-hidden="true" />
            <span>{p.label}</span>
            <span className="rq-dash-legend-value">
              {p.value} · {formatMoney(p.sales || 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

SegmentBar.propTypes = {
  parts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      sales: PropTypes.number,
    })
  ).isRequired,
};

/** Orders by two-hour block of the day. Peak block is highlighted; hover shows the count. */
export const HourBars = ({ bins }) => {
  const peak = Math.max(0, ...bins.map((b) => b.count));
  if (!peak) return <div className="rq-dash-muted">No orders in this period</div>;
  return (
    <div className="rq-dash-hours" role="img" aria-label="Orders by time of day, two-hour blocks">
      {bins.map((b) => (
        <div key={b.key} className="rq-dash-hour" title={`${b.label}:00 – ${String(b.key * 2 + 2).padStart(2, '0')}:00 · ${b.count} orders`}>
          <span className="rq-dash-hour-count">{b.count || ''}</span>
          <div className="rq-dash-hour-track">
            <div
              className={`rq-dash-hour-bar${b.count === peak ? ' is-peak' : ''}`}
              style={{ height: `${b.count ? Math.max(6, (b.count / peak) * 100) : 0}%` }}
            />
          </div>
          <span className="rq-dash-hour-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

HourBars.propTypes = {
  bins: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.number, label: PropTypes.string, count: PropTypes.number })).isRequired,
};

/** Small trend line for a stat tile (2px line, 10% area wash). */
export const Sparkline = ({ values, height = 34 }) => {
  const [ref, width] = useElementWidth();
  if (!values.length) return <div ref={ref} style={{ height }} />;
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = height - 3 - (v / max) * (height - 6);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <div ref={ref} className="rq-dash-spark" style={{ height }} aria-hidden="true">
      {width > 0 && (
        <svg width={width} height={height}>
          <path d={area} className="rq-dash-spark-area" />
          <path d={line} className="rq-dash-spark-line" />
        </svg>
      )}
    </div>
  );
};

Sparkline.propTypes = {
  values: PropTypes.arrayOf(PropTypes.number).isRequired,
  height: PropTypes.number,
};
