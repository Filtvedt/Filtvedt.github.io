import type { ChessGame } from "../ChessGame";
import type { AI, BoardScorer, Move, ThreefoldRepetitionEntry } from "../types";

export class RandomMoveDelux implements AI {
    boardScorer: BoardScorer

    constructor(boardScorer: BoardScorer) {
        this.boardScorer = boardScorer
    }

    async getMove(chessGame: ChessGame, threefoldRepetitionStack: ThreefoldRepetitionEntry[], remaningSeconds: number, maxDepth: number): Promise<Move> {
        const legalMoves = chessGame.getLegalMoves()
        if (legalMoves.length === 0) throw new Error("No legal moves present - the game should have ended!")
        const randomIndex = Math.floor(Math.random() * (legalMoves.length - 1))
        return legalMoves[randomIndex]
    };


}