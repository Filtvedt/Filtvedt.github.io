import { type FenConverter, type Board, type ChessBoardSize, type Square, PlayerColor, PieceType, type Tuple, type Piece, type CastleRights, type PlayerOption, type EnPassantTarget, type Move, type Attack, type DirectionIncrement } from "./types";

//[y][x]

export const CHESS_BOARD_SIZE: ChessBoardSize = 8
export const CHESS_BOARD_MAX_INDEX = CHESS_BOARD_SIZE - 1
export const CHESS_BOARD_MIN_INDEX = 0
export const CENTER_INDEX = 4


export const isEnPassantCapture = (move: Move): boolean => {
    return move.from.piece.type === PieceType.PAWN &&
        move.from.x != move.to.x &&
        move.to.piece == null
}

export const playerOptionKeyFromPlayerColor = (playerColor: PlayerColor): keyof PlayerOption<any> => {
    if (playerColor === PlayerColor.BLACK) return 'black'
    else if (playerColor === PlayerColor.WHITE) return 'white'
    throw new Error("Unknown player color!")

}

export const directionIncrementer: DirectionIncrement = {
    east: { x: 1, y: 0 },
    southEast: { x: 1, y: -1 },
    south: { x: 0, y: -1 },
    southWest: { x: -1, y: -1 },
    west: { x: -1, y: 0 },
    northWest: { x: -1, y: 1 },
    north: { x: 0, y: 1 },
    northEast: { x: 1, y: 1 }
}

//export const getPawnPushScore

export const getPieceScore = (piece: Piece): number => {
    const colorMultiplier = piece.color === PlayerColor.WHITE ? 1 : -1
    return (getPieceBaseScore(piece) * colorMultiplier)
}
export const getPieceBaseScore = (piece: Piece): number => {
    switch (piece.type) {
        case PieceType.BISHOP:
        case PieceType.KNIGHT:
            return 3
        case PieceType.PAWN: return 1
        case PieceType.ROOK: return 5
        case PieceType.QUEEN: return 9
        default: return 0

    }
}

export const SCORE_INFINITY = 10000
export const NEGATIVE_SCORE_INFINITY = -10000
export const BLACK_CHECK_MATE_SCORE = -1000
export const WHITE_CHECK_MATE_SCORE = 1000
export const PAWN_CHAIN_SCORE = 0.6
export const PAWN_ADVANCEMENT_SCORE = 0.05

export const actionSorting = (moveA: Move, moveB: Move) => {
    if (moveA.to.piece && !moveB.to.piece) return -1
    if (!moveA.to.piece && moveB.to.piece) return 1
    const pieceScore = getPieceBaseScore(moveB.from.piece) - getPieceBaseScore(moveA.from.piece)
    if(pieceScore != 0) return pieceScore
    const moveA_AdvancementScore = moveA.from.piece.color === PlayerColor.WHITE ? moveA.from.y : (CHESS_BOARD_MAX_INDEX - moveA.from.y)
    const moveB_AdvancementScore = moveB.from.piece.color === PlayerColor.WHITE ? moveB.from.y : (CHESS_BOARD_MAX_INDEX - moveB.from.y)
    const advancementScore = moveB_AdvancementScore - moveA_AdvancementScore
    if(advancementScore != 0) return advancementScore

    const moveA_CenterScore = CENTER_INDEX - Math.abs(moveA.from.x - CENTER_INDEX)
    const moveB_CenterScore = CENTER_INDEX - Math.abs(moveB.from.x - CENTER_INDEX)
    const centerScore = moveB_CenterScore - moveA_CenterScore
    return centerScore

}






