import type { ChessGame } from "../ChessGame";
import { BLACK_CHECK_MATE_SCORE, CHESS_BOARD_MAX_INDEX, CHESS_BOARD_MIN_INDEX, PAWN_ADVANCEMENT_SCORE, PAWN_CHAIN_SCORE, WHITE_CHECK_MATE_SCORE, getPieceBaseScore, getPieceScore } from "../gameUtils";
import { PlayerColor, type BoardScorer, type Move, type ThreefoldRepetitionEntry, type Piece, PieceType, type NonNullableFields, type Square, type Board, type Coordinate } from "../types";

export class BestEvaluatorV1 implements BoardScorer {
    getScore(chessGame: ChessGame, threefoldRepetitionStack: ThreefoldRepetitionEntry[], depth: number): number {

        if (chessGame.getLegalMoves().length === 0) {
            return chessGame.kingInCheck(PlayerColor.WHITE) ? (BLACK_CHECK_MATE_SCORE - depth) : (chessGame.kingInCheck(PlayerColor.BLACK) ? (WHITE_CHECK_MATE_SCORE + depth) : 0)
        }
        if (threefoldRepetitionStack.some(entry => entry.timesReached >= 3)) return 0

        const flatBoard = chessGame.board.flat()

        const totPieceScore = flatBoard
            .map(square => square.piece ? getPieceScore(square.piece) : 0)
            .reduce((tot, pieceScore) => tot + pieceScore, 0)

        const chainScore = flatBoard
            .map(square => square.piece && square.piece.type === PieceType.PAWN ? this.getChainScore(square as NonNullableFields<Square>, chessGame.board) : 0)
            .flat()
            .reduce((tot, pieceScore) => tot + pieceScore, 0)

            const advancementScore = flatBoard.filter(square => square.piece?.type === PieceType.PAWN)
            .map(pawnSquare => pawnSquare.piece?.color === PlayerColor.WHITE ? (pawnSquare.y - 2)*PAWN_ADVANCEMENT_SCORE : (CHESS_BOARD_MAX_INDEX-(pawnSquare.y +2))*PAWN_ADVANCEMENT_SCORE)
            .reduce((tot, pieceScore) => tot + pieceScore, 0)

        //Reward for pawn center placement
        //Punish isolated pawns
        //Punish double pawns
        //Reward piece development (#only move a piece once in the opening)
        //Reward for connected rooks
        //Somehow reward if king is safe (how is the king safe???)
        //


        return totPieceScore + chainScore + advancementScore
    }


    getChainScore = (pawnSquare: NonNullableFields<Square>, board: Board): number[] => {
        const chainCoordinates = [
            { color: PlayerColor.WHITE, x: pawnSquare.x + 1, y: pawnSquare.y + 1 },
            { color: PlayerColor.WHITE, x: pawnSquare.x - 1, y: pawnSquare.y + 1 },
            { color: PlayerColor.BLACK, x: pawnSquare.x - 1, y: pawnSquare.y - 1 },
            { color: PlayerColor.BLACK, x: pawnSquare.x + 1, y: pawnSquare.y - 1 },
        ]

        return chainCoordinates.filter(co => pawnSquare.piece.color === co.color && this.coordinateInsideBoard({ ...co }) &&
            board[co.y][co.x].piece?.color === pawnSquare.piece.color && board[co.y][co.x].piece?.type === PieceType.PAWN)
            .map(co => pawnSquare.piece.color === PlayerColor.WHITE ? PAWN_CHAIN_SCORE : (PAWN_CHAIN_SCORE * -1))
            

    }

    private coordinateInsideBoard(coordinate: Coordinate): boolean {
        return coordinate.x >= CHESS_BOARD_MIN_INDEX && coordinate.x <= CHESS_BOARD_MAX_INDEX && coordinate.y >= CHESS_BOARD_MIN_INDEX && coordinate.y <= CHESS_BOARD_MAX_INDEX
    }


}