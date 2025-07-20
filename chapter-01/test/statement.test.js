import { describe, it, expect } from "vitest";
import { statement, htmlStatement } from "../src/statement.js";
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

describe("htmlStatement 함수 테스트", () => {
  it("invoices.json과 plays.json 데이터로 올바른 HTML 청구 내역을 생성해야 한다", () => {
    // 테스트용 데이터
    const testInvoice = invoices[0]; // BigCo 고객의 데이터
    const testPlays = plays;

    // htmlStatement 함수 실행
    const result = htmlStatement(testInvoice, testPlays);

    // HTML 구조 검증
    expect(result).toContain("<h1>청구 내역 (고객명: BigCo)</h1>");
    expect(result).toContain("<table>");
    expect(result).toContain(
      "<tr><th>연극</th><th>좌석 수</th><th>금액</th></tr>"
    );
    expect(result).toContain("</table>");
    expect(result).toContain("<p>총액: <em>$1,730.00</em></p>");
    expect(result).toContain("<p>적립 포인트: <em>47</em>점</p>");

    // 연극 정보 검증
    expect(result).toContain(
      "<tr><td>Hamlet</td><td>(55석)</td><td>$650.00</td>"
    );
    expect(result).toContain(
      "<tr><td>As You Like It</td><td>(35석)</td><td>$580.00</td>"
    );
    expect(result).toContain(
      "<tr><td>Othello</td><td>(40석)</td><td>$500.00</td>"
    );

    // HTML 태그가 올바르게 닫혀있는지 검증
    expect(result).toMatch(/<h1>.*<\/h1>/);
    expect(result).toMatch(/<table>.*<\/table>/s);
    expect(result).toMatch(/<p>총액: <em>.*<\/em><\/p>/);
    expect(result).toMatch(/<p>적립 포인트: <em>.*<\/em>점<\/p>/);
  });
});
