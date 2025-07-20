import { describe, it, expect } from "vitest";
import statement from "../src/statement.js";
import invoices from "../src/invoices.json";
import plays from "../src/plays.json";

describe("statement 함수 테스트", () => {
  it("invoices.json과 plays.json 데이터로 올바른 청구 내역을 생성해야 한다", () => {
    // 테스트용 데이터
    const testInvoice = invoices[0]; // BigCo 고객의 데이터
    const testPlays = plays;

    // statement 함수 실행
    const result = statement(testInvoice, testPlays);

    // 예상 결과 계산
    // 청구 내역 (고객명: BigCo)
    // Hamlet: $650.00 (55석)
    // As You Like It: $580.00 (35석)
    // Othello: $500.00 (40석)
    // 총액: $1,730.00
    // 적립 포인트: 47점

    // 결과 검증
    expect(result).toContain("청구 내역 (고객명: BigCo)");
    expect(result).toContain("Hamlet: $650.00 (55석)");
    expect(result).toContain("As You Like It: $580.00 (35석)");
    expect(result).toContain("Othello: $500.00 (40석)");
    expect(result).toContain("총액: $1,730.00");
    expect(result).toContain("적립 포인트: 47점");
  });
});
