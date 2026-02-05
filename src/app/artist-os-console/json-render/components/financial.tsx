"use client";

import type { ComponentRenderProps } from "@json-render/react";
import type { Tone } from "../catalog";
import { chartPalette, formatValue, toneClass } from "./shared";

export function FinancialBreakdown({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    title?: string;
    type?: "budget" | "revenue" | "expense" | "projection";
    currency?: string;
    total?: number;
    categories?: {
      name: string;
      amount: number;
      percent?: number | null;
      tone?: Tone | null;
      description?: string | null;
    }[];
    showChart?: boolean | null;
    showPercentages?: boolean | null;
  };
  const {
    title,
    type,
    currency,
    total = 0,
    categories,
    showChart,
    showPercentages,
  } = props;

  const safeCategories = Array.isArray(categories) ? categories : [];

  const percentages = safeCategories.map((item) =>
    item.percent != null ? item.percent : total > 0 ? (item.amount / total) * 100 : 0
  );

  const cumulativeTotals = percentages.reduce<number[]>((acc, value) => {
    const nextTotal = (acc[acc.length - 1] ?? 0) + value;
    return [...acc, nextTotal];
  }, []);

  const segments = safeCategories.map((_, index) => {
    const start = cumulativeTotals[index - 1] ?? 0;
    const end = cumulativeTotals[index] ?? 0;
    return `${chartPalette[index % chartPalette.length]} ${start}% ${end}%`;
  });

  return (
    <div className="jr-financial">
      <div className="jr-financial-header">
        <h4>{title}</h4>
        <span className="jr-financial-total">
          Total {formatValue(total, "currency", currency)}
        </span>
      </div>
      {showChart && (
        <div
          className="jr-financial-chart"
          style={{ background: `conic-gradient(${segments.join(", ")})` }}
        />
      )}
      <ul>
        {safeCategories.map((category, index) => (
          <li key={`category-${index}`} className={toneClass(category.tone)}>
            <div>
              <strong>{category.name}</strong>
              {category.description && <p>{category.description}</p>}
            </div>
            <div>
              <span>{formatValue(category.amount, "currency", currency)}</span>
              {showPercentages && (
                <span className="jr-financial-percent">
                  {Math.round(percentages[index] ?? 0)}%
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="jr-financial-type">Type: {type}</p>
    </div>
  );
}

export function RecoupmentCalculator({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    advance?: number;
    royaltyRate?: number;
    recoupableExpenses?: number;
    estimatedRevenue?: number | null;
    breakEvenStreams?: number | null;
    currency?: string;
    recouped?: boolean | null;
  };
  const {
    advance = 0,
    royaltyRate = 0,
    recoupableExpenses = 0,
    estimatedRevenue,
    breakEvenStreams,
    currency,
    recouped,
  } = props;

  const totalRecoup = advance + recoupableExpenses;

  return (
    <div className="jr-recoupment">
      <h4>Recoupment Calculator</h4>
      <ul>
        <li>
          <span>Advance</span>
          <strong>{formatValue(advance, "currency", currency)}</strong>
        </li>
        <li>
          <span>Recoupable expenses</span>
          <strong>{formatValue(recoupableExpenses, "currency", currency)}</strong>
        </li>
        <li>
          <span>Total to recoup</span>
          <strong>{formatValue(totalRecoup, "currency", currency)}</strong>
        </li>
        <li>
          <span>Royalty rate</span>
          <strong>{royaltyRate}%</strong>
        </li>
        {estimatedRevenue != null && (
          <li>
            <span>Estimated revenue</span>
            <strong>{formatValue(estimatedRevenue, "currency", currency)}</strong>
          </li>
        )}
        {breakEvenStreams != null && (
          <li>
            <span>Break-even streams</span>
            <strong>{formatValue(breakEvenStreams, "number")}</strong>
          </li>
        )}
      </ul>
      {recouped != null && (
        <p className={recouped ? "jr-recouped" : "jr-not-recouped"}>
          {recouped ? "Recouped" : "Not recouped"}
        </p>
      )}
    </div>
  );
}

export function TaxReserve({ element }: ComponentRenderProps) {
  const props = (element.props ?? {}) as {
    income?: number;
    reservePercentage?: number;
    reserveAmount?: number;
    breakdown?: {
      selfEmployment: number;
      federalIncome: number;
      stateIncome?: number | null;
    } | null;
    currency?: string;
  };
  const {
    income = 0,
    reservePercentage = 0,
    reserveAmount = 0,
    breakdown,
    currency,
  } = props;

  return (
    <div className="jr-tax">
      <h4>Tax Reserve</h4>
      <p>
        Set aside {reservePercentage}% of income: {" "}
        <strong>{formatValue(reserveAmount, "currency", currency)}</strong>
      </p>
      <ul>
        <li>
          <span>Income</span>
          <strong>{formatValue(income, "currency", currency)}</strong>
        </li>
        {breakdown && (
          <>
            <li>
              <span>Self-employment</span>
              <strong>{formatValue(breakdown.selfEmployment, "currency", currency)}</strong>
            </li>
            <li>
              <span>Federal income</span>
              <strong>{formatValue(breakdown.federalIncome, "currency", currency)}</strong>
            </li>
            {breakdown.stateIncome != null && (
              <li>
                <span>State income</span>
                <strong>{formatValue(breakdown.stateIncome, "currency", currency)}</strong>
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  );
}
