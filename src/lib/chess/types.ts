import type { FirstMoveDelux } from "./AI/firstMoveDelux"
import type { RandomMoveDelux } from "./AI/randomMoveDelux"
import type { ChessGame } from "./ChessGame"

export type GameConfig = {
    readonly gameMode:GameMode,
    readonly FEN: string | null
}

export type TimeFormat = {
    readonly secondsStartTime: number,
    readonly secondsIncrement: number
}

export type GameMode = SinglePlayerVsAi & {type:'SinglePlayerVsAi'} | AiVsAi & {type:'AiVsAi'}

export type SinglePlayerVsAi = {
    readonly playerColor:PlayerColor,
    readonly algorithmOption:AlgorithmOption,
    readonly timeFormat: PlayerOption<TimeFormat> | null
}

export type AiVsAi = {
    readonly algorithmOptions: PlayerOption<AlgorithmOption>,
    readonly timeFormat: PlayerOption<TimeFormat> | null,
    readonly playerColor:PlayerColor
}

export type Coordinate = {
    x:number,
    y:number
}

export type PlayerOption<Type> = {
    [Property in keyof PlayerTypes]: Type;
}

type PlayerTypes = {
    black: () => void,
    white: () => void
}

export type FenConverter<Type> = {
    readonly toFen: () => string
    readonly toGame: () => Type
    readonly defaultFen: string
}

export type ChessBoardSize = 8

export type Board8x8<P> = Tuple<Tuple<P, ChessBoardSize>, ChessBoardSize>;

export type Board = Board8x8<Square>

export type Square = {
    piece: Piece | null
    notation: string,
    x: number,
    y: number
}

export type Piece = {
    color: PlayerColor,
    type: PieceType
}

export enum PieceType {
    PAWN = 'PAWN',
    KNIGHT = 'KNIGHT',
    BISHOP = 'BISHOP',
    ROOK = 'ROOK',
    QUEEN = 'QUEEN',
    KING = 'KING'
}

export enum PlayerColor {
    WHITE = 'WHITE',
    BLACK = 'BLACK'
}

export type EnPassantTarget = 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3' | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'

export type CastleRights = {
    [Property in keyof CasteTypes]: boolean;
}

export type CasteTypes = {
    queenSide: () => void,
    kingSide: () => void
}

export type HitsoryEntry = {
    game:ChessGame,
    move:Move | null 
}

export type Attack = {
    attackTarget: Square,
    attacker: {
        piece: Piece,
        pieceSquare: Square
    }
}

export type Move = {
    from: NonNullableFields<Square>,
    to: Square
    promotion?: PieceType.BISHOP | PieceType.KNIGHT | PieceType.ROOK | PieceType.QUEEN
}

export type ThreefoldRepetitionEntry = {
    position:ThreefoldRepetitionPosition,
    timesReached:number
}

export type ThreefoldRepetitionPosition = {
    board:Board,
    legalMoves:Move[]
}

export type AlgorithmOption = {
    motor:AI,
    depth:number
}

export interface BoardScorer {
    getScore:(chessGame:ChessGame, threefoldRepetitionStack:ThreefoldRepetitionEntry[], depth:number) => number
}

export interface AI {
    boardScorer:BoardScorer
    getMove:(chessGame:ChessGame,threefoldRepetitionStack:ThreefoldRepetitionEntry[],remaningSeconds:number,maxDepth:number) => Promise<Move>
}

export type Node = {
    threefoldRepetitionStack:ThreefoldRepetitionEntry[],
    chessGame:ChessGame,
}

export type ScoredMove = {
    move:Move | null,
    score:number,
}

export type DirectionIncrement = {
    [Property in keyof DirectionKey]: Coordinate;
}

export enum Direction {
    east="east",
    southEast="southEast",
    south="south",
    southWest="southWest",
    west="west",
    northWest="northWest",
    north="north",
    northEast="northEast"
}

export type DirectionKey = {
    east: () => void,
    southEast: () => void,
    south: () => void,
    southWest: () => void,
    west: () => void,
    northWest: () => void,
    north: () => void,
    northEast: () => void,
}

export enum Result {
    WHITE_VICTORY="WHITE_VICTORY",
    BLACK_VICTORY="BLACK_VICTORY",
    DRAW="DRAW",
    DRAW_50_MOVE_RULE="DRAW_50_MOVE_RULE",
    DRAW_THREEFOLD_REPETITION="DRAW_THREEFOLD_REPETITION"
}

export type AiWorkerMessage = {
    command:WorkerCommand.Start,
    payload:{move:Move,topNode:Node,maxDepth:number,isMaximizingPlayer:boolean, index:number}
} |{
    command:WorkerCommand.UpdateAlpha,
        payload:{alpha:number}
}|{
    command:WorkerCommand.UpdateBeta,
    payload:{beta:number}
}|
{
    command:WorkerCommand.Reset
}

export type AiWorkerResponse = {
    type:AiWorkerResponseType.Complete,
    payload:ScoredMove
} | {
    type:AiWorkerResponseType.Alpha,
    payload:number
} | {
    type:AiWorkerResponseType.Beta,
    payload:number
}

export enum AiWorkerResponseType {
    Complete = 'Complete',
    Alpha = 'Alpha',
    Beta = 'Beta'
}

export enum WorkerCommand {
    Start = 'Start',
    UpdateAlpha = 'UpdateAlpha',
    UpdateBeta = 'UpdateBeta',
    Reset = 'Reset',
}

//GENERICS

export type NonNullableFields<T> = {
    [P in keyof T]: NonNullable<T[P]>
}

export type Predicate<T> = (t: T) => boolean

export type Tuple<T, N extends number, A extends any[] = []> = A extends { length: N } ? A : Tuple<T, N, [...A, T]>


