import type {ChessGame} from "../ChessGame";
import {
    BLACK_CHECK_MATE_SCORE,
    CHESS_BOARD_MAX_INDEX,
    CHESS_BOARD_MIN_INDEX,
    PAWN_ADVANCEMENT_SCORE,
    PAWN_CHAIN_SCORE,
    WHITE_CHECK_MATE_SCORE,
    getPieceBaseScore,
    getPieceScore,
    CENTER_INDEX,
    ATTACKING_SQUARE_SCORE,
    DEFEND_SCORE,
    ATTACKING_ENEMY_PIECE_MODIFIER,
    CENTRE_RING_CONTROL_SCORE,
    GIVE_CHECK_SCORE, CENTRE_LEVEL_TWO_RING_CONTROL_SCORE
} from "../gameUtils";
import {
    PlayerColor,
    type
        BoardScorer,
    type
        Move,
    type
        ThreefoldRepetitionEntry,
    type
        Piece,
    PieceType,
    type
        NonNullableFields,
    type
        Square,
    type
        Board,
    type
        Coordinate
} from "../types";

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
            .map(pawnSquare => pawnSquare.piece?.color === PlayerColor.WHITE ? (pawnSquare.y - 2) * PAWN_ADVANCEMENT_SCORE : ((CHESS_BOARD_MAX_INDEX - (pawnSquare.y + 2)) * PAWN_ADVANCEMENT_SCORE) * -1)
            .reduce((tot, pieceScore) => tot + pieceScore, 0)

        const attackScore = flatBoard
            .map(square => chessGame.getAttacksForPiece(square))
            .flat()
            .map(attack => {
                let attackScore = ATTACKING_SQUARE_SCORE
                if (attack.attackTarget.piece != null) {
                    attackScore += attack.attackTarget.piece.color === attack.attacker.piece.color ? DEFEND_SCORE : ATTACKING_ENEMY_PIECE_MODIFIER * getPieceBaseScore(attack.attackTarget.piece)
                    if (attack.attackTarget.piece.color !== attack.attacker.piece.color && attack.attackTarget.piece.type === PieceType.KING) {
                        attackScore += GIVE_CHECK_SCORE
                    }
                }
                attackScore += ['d5', 'd4', 'e5', 'e4'].filter(n => attack.attackTarget.notation === n).length * CENTRE_RING_CONTROL_SCORE
                attackScore += ['c5', 'c4', 'f5', 'f4'].filter(n => attack.attackTarget.notation === n).length * CENTRE_LEVEL_TWO_RING_CONTROL_SCORE

                return attack.attacker.piece.color === PlayerColor.BLACK ? attackScore * -1 : attackScore

            })
            .reduce((tot, attackScore) => tot + attackScore, 0)


        //Reward for pawn center placement
        //Punish isolated pawns
        //Punish double pawns
        //Reward piece development (#only move a piece once in the opening)
        //Reward for connected rooks
        //Punish moving king if castling is available
        //Reward ability to castle, but somehow reward if king is safe more (how is the king safe???)


        return totPieceScore + chainScore + advancementScore + attackScore
    }


    getChainScore = (pawnSquare: NonNullableFields<Square>, board: Board): number[] => {
        const chainCoordinates = [
            {color: PlayerColor.WHITE, x: pawnSquare.x + 1, y: pawnSquare.y + 1},
            {color: PlayerColor.WHITE, x: pawnSquare.x - 1, y: pawnSquare.y + 1},
            {color: PlayerColor.BLACK, x: pawnSquare.x - 1, y: pawnSquare.y - 1},
            {color: PlayerColor.BLACK, x: pawnSquare.x + 1, y: pawnSquare.y - 1},
        ]

        return chainCoordinates.filter(co => pawnSquare.piece.color === co.color && this.coordinateInsideBoard({
                x: co.x,
                y: co.y
            }) &&
            board[co.y][co.x].piece?.color === pawnSquare.piece.color && board[co.y][co.x].piece?.type === PieceType.PAWN)
            .map(co => pawnSquare.piece.color === PlayerColor.WHITE ? PAWN_CHAIN_SCORE : (PAWN_CHAIN_SCORE * -1))


    }

    private coordinateInsideBoard(coordinate: Coordinate): boolean {
        return coordinate.x >= CHESS_BOARD_MIN_INDEX && coordinate.x <= CHESS_BOARD_MAX_INDEX && coordinate.y >= CHESS_BOARD_MIN_INDEX && coordinate.y <= CHESS_BOARD_MAX_INDEX
    }


}