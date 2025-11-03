declare module 'xd-crossword-parser' {
  interface XDParserResult {
    grid: string[][];
    meta: {
      Author?: string;
      Editor?: string;
      Copyright?: string;
      Date?: string;
      Title?: string;
      Difficulty?: string;
      Type?: string;
    };
    across: Array<{
      num: string;
      question: string;
      answer: string;
    }>;
    down: Array<{
      num: string;
      question: string;
      answer: string;
    }>;
  }

  function XDParser(xd: string): XDParserResult;
  export default XDParser;
}
