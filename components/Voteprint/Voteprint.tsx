'use client';

/**
 * Voteprint canvas.
 *
 * Renders a donut-ring chart where each arc sector represents an issue
 * category. Individual votes are drawn as radial straight lines radiating
 * outward from the inner ring, encoding alignment with the issue position:
 *   - aligned (alignedWithIssue === true)  → outward: innerR → outerR*0.85, 2.5px
 *   - opposed (alignedWithIssue === false) → inward: outerR*0.85 → outerR*0.45, 1.5px
 *   - null + yea                           → outward: innerR → outerR*0.45, 1.5px
 *   - null + nay                           → outward stub: innerR → outerR*0.25, 1px
 *   - absent                               → not drawn
 *
 * Click or use keyboard (← → Escape Enter) to select / deselect categories.
 * DPR-scaled for sharp rendering on retina displays.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { Vote } from '@/lib/voteprint';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  seededRandom,
  getWedgeAtPoint,
} from '@/lib/voteprint/utils';
import type { WedgeAngle } from '@/lib/voteprint/utils';
import styles from './Voteprint.module.css';

interface VoteprintProps {
  votes: Vote[];
  activeCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  repName: string;
  size?: number;
}

const GAP_RADIANS = 0.025; // gap between wedge sectors
const INNER_RATIO = 0.27; // innerR as fraction of size
const OUTER_RATIO = 0.46; // outerR as fraction of size

export default function Voteprint({
  votes,
  activeCategory,
  onCategorySelect,
  repName,
  size = 220,
}: VoteprintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wedgeAnglesRef = useRef<WedgeAngle[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const innerR = size * INNER_RATIO;
    const outerR = size * OUTER_RATIO;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Group mapped votes by category (skip uncategorized)
    const byCategory = new Map<string, Vote[]>();
    for (const vote of votes) {
      if (!vote.category) continue;
      const key = vote.category;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(vote);
    }

    const categories = [...byCategory.keys()];
    const total = categories.reduce(
      (sum, k) => sum + (byCategory.get(k)?.length ?? 0),
      0,
    );

    if (total === 0) return;

    // Build proportional wedge angles, starting at top (–π/2)
    const newWedges: WedgeAngle[] = [];
    const totalGap = categories.length * GAP_RADIANS;
    let angle = -Math.PI / 2;

    for (const categoryId of categories) {
      const count = byCategory.get(categoryId)!.length;
      const sweep = (count / total) * (2 * Math.PI - totalGap);
      newWedges.push({
        categoryId,
        startAngle: angle,
        endAngle: angle + sweep,
      });
      angle += sweep + GAP_RADIANS;
    }
    wedgeAnglesRef.current = newWedges;

    // Draw each wedge
    for (const wedge of newWedges) {
      const color = CATEGORY_COLORS[wedge.categoryId] ?? '#94a3b8';
      const isActive =
        activeCategory === null || activeCategory === wedge.categoryId;

      ctx.globalAlpha = isActive ? 1 : 0.2;

      // Sector fill
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, wedge.startAngle, wedge.endAngle);
      ctx.arc(cx, cy, innerR, wedge.endAngle, wedge.startAngle, true);
      ctx.closePath();
      ctx.fillStyle = isDark ? `${color}28` : `${color}18`;
      ctx.fill();

      // Sector arc stroke
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, wedge.startAngle, wedge.endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, wedge.startAngle, wedge.endAngle);
      ctx.strokeStyle = isDark ? `${color}88` : `${color}66`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Vote lines
      const votesInWedge = byCategory.get(wedge.categoryId)!;
      const range = wedge.endAngle - wedge.startAngle;

      // Minimum presence arc — drawn when all votes in the wedge are absent
      const allAbsent = votesInWedge.every((v) => v.position === 'absent');
      if (allAbsent) {
        const arcR = innerR + 2;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, wedge.startAngle, wedge.endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = isActive ? 0.35 : 0.1;
        ctx.stroke();
        ctx.globalAlpha = isActive ? 1 : 0.2;
      }

      for (const vote of votesInWedge) {
        if (vote.position === 'absent') continue;

        const r1 = seededRandom(vote.rollCall * 31 + 7);

        const voteAngle = wedge.startAngle + r1 * range;

        const { alignedWithIssue } = vote;

        // Opposed votes draw inward from the inner ring toward center — handled
        // separately so the direction is explicit and cannot be conflated with
        // outward spokes. Nothing is drawn in the outer zone for opposed votes.
        if (alignedWithIssue === false) {
          const fromR = innerR;
          const toR = innerR * 0.15;

          const x1 = cx + Math.cos(voteAngle) * fromR;
          const y1 = cy + Math.sin(voteAngle) * fromR;
          const x2 = cx + Math.cos(voteAngle) * toR;
          const y2 = cy + Math.sin(voteAngle) * toR;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = isActive ? 0.6 : 0.15;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
          continue;
        }

        let fromR: number;
        let toR: number;
        let lineWeight: number;
        let opacity: number;

        if (alignedWithIssue === true) {
          fromR = innerR; toR = outerR * 0.85; lineWeight = 2.5; opacity = isActive ? 0.85 : 0.15;
        } else if (vote.position === 'yea') {
          fromR = innerR; toR = outerR * 0.45; lineWeight = 1.5; opacity = isActive ? 0.65 : 0.15;
        } else {
          // null + nay
          fromR = innerR; toR = outerR * 0.25; lineWeight = 1; opacity = isActive ? 0.4 : 0.15;
        }

        const x1 = cx + fromR * Math.cos(voteAngle);
        const y1 = cy + fromR * Math.sin(voteAngle);
        const x2 = cx + toR * Math.cos(voteAngle);
        const y2 = cy + toR * Math.sin(voteAngle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWeight;
        ctx.globalAlpha = opacity;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }, [votes, activeCategory, size]);

  useEffect(() => {
    draw();

    // Redraw when the system color-scheme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onColorSchemeChange = () => draw();
    mq.addEventListener('change', onColorSchemeChange);
    return () => mq.removeEventListener('change', onColorSchemeChange);
  }, [draw]);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = size / 2;
      const cy = size / 2;

      const hit = getWedgeAtPoint(
        x,
        y,
        cx,
        cy,
        size * INNER_RATIO,
        size * OUTER_RATIO,
        wedgeAnglesRef.current,
      );

      // Toggle: clicking the active category deselects it
      onCategorySelect(hit === activeCategory ? null : hit);
    },
    [size, activeCategory, onCategorySelect],
  );

  // ---------------------------------------------------------------------------
  // Keyboard handler — Arrow keys cycle categories, Escape clears, Enter toggles
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const wedges = wedgeAnglesRef.current;
      if (wedges.length === 0) return;

      if (e.key === 'Escape') {
        onCategorySelect(null);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIdx = activeCategory
          ? wedges.findIndex((w) => w.categoryId === activeCategory)
          : -1;

        let nextIdx: number;
        if (e.key === 'ArrowRight') {
          nextIdx = currentIdx < wedges.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : wedges.length - 1;
        }
        onCategorySelect(wedges[nextIdx].categoryId);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeCategory) {
          onCategorySelect(null);
        } else if (wedges.length > 0) {
          onCategorySelect(wedges[0].categoryId);
        }
      }
    },
    [activeCategory, onCategorySelect],
  );

  // ---------------------------------------------------------------------------
  // Dynamic accessible label
  // ---------------------------------------------------------------------------

  const ariaLabel = activeCategory
    ? `${repName} voting record chart. Currently showing ${CATEGORY_LABELS[activeCategory] ?? activeCategory} votes. Press Escape to show all, or use arrow keys to change category.`
    : `${repName} voting record chart. Use arrow keys to cycle categories, or click a wedge to filter by issue.`;

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
