import type { ChessGame } from "../ChessGame";
import type { BoardScorer, Move, PlayerColor, ThreefoldRepetitionEntry } from "../types";

export class DrawScorer implements BoardScorer {
    getScore(chessGame:ChessGame, threefoldRepetitionStack:ThreefoldRepetitionEntry[], depth:number):number{
        return 0
    }
    
}