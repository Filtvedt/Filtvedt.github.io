import { ChessGame } from "./ChessGame";
import { CHESS_BOARD_MAX_INDEX, CHESS_BOARD_MIN_INDEX, CHESS_BOARD_SIZE } from "./gameUtils";
import { type FenConverter, type Board, type ChessBoardSize, type Square, PlayerColor, PieceType, type Tuple, type Piece, type CastleRights, type PlayerOption, type EnPassantTarget, type Move, type GameConfig, Result, type HitsoryEntry, type ThreefoldRepetitionEntry, type ThreefoldRepetitionPosition } from "./types";

export class GameManager implements FenConverter<ChessGame> {
    readonly defaultFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    private fen: string;
    readonly chessGame: ChessGame
    readonly gameConfig: GameConfig
    history: HitsoryEntry[]
    result: Result | null
    threefoldRepetitionStack:ThreefoldRepetitionEntry[]

    log = {
        game: () => console.log("Game: ", this.chessGame),
        board: () => console.log("Game board: ", this.chessGame.board),
        fen: () => console.log("Game as fen: ", this.toFen()),
        custom: () => console.log("custom", this.chessGame.board[1][2])
    }

    constructor(gameConfig: GameConfig) {
        this.fen = gameConfig.FEN ?? this.defaultFen
        this.gameConfig = gameConfig
        this.chessGame = this.toGame()
        this.result = null
        this.history = []
        this.threefoldRepetitionStack = []
        this.pushToHistory()
        this.checkShouldStopGame()
        this.checkAndHandleSinglePlayerMove()
        if (gameConfig.gameMode.type === "AiVsAi") {
            this.autoPlay(0)
        }
    
    }

    toFen() {
        const fenParts = [
            this.getBoardFen(),
            this.getPlayerFen(),
            this.getCastleRightsFen(),
            this.getEnPassantFen(),
            this.getHalfmoveClockFen(),
            this.getFullmoveNumberFen()
        ]
        return fenParts.reduce((a, c) => a + (a.length > 0 ? ' ' : '') + c, '')
    }

    toGame() {
        return new ChessGame(this.getBoardFromFen(),
            this.getPlayerTurnFromFen(),
            this.getCastleRightsFromFen(),
            this.getEnPassantFromFen(),
            this.getHalfmoveClockFromFen(),
            this.getFullmoveNumberFromFen())
    }

    getLegalMoves(): Move[] {
        return this.chessGame.getLegalMoves()
    }

    makeMove(move: Move): void {
        if (this.checkShouldStopGame()) return
        const legalMoves = this.getLegalMoves()
        const isLegalMove = legalMoves.some(legalMove => legalMove.from.notation === move.from.notation && legalMove.to.notation === move.to.notation && legalMove.promotion == move.promotion)
        if (!isLegalMove) {
            console.log("Illegal move!", move, legalMoves.filter(m => m.from.piece.type === PieceType.KING))
            return
        }
        this.chessGame.makeMove(move)
        this.pushToHistory(move)
        this.updateThreefoldRepetition()


        if (this.checkShouldStopGame()) return

        //this.checkAndHandleSinglePlayerMove()

    }

    updateThreefoldRepetition():void{
        let newEntry:ThreefoldRepetitionPosition = {
            board:JSON.parse(JSON.stringify(this.chessGame.board)),
            legalMoves:this.getLegalMoves()
        }
        const index = this.threefoldRepetitionStack.findIndex(threefoldRepetitionEntry => {
            const boardPositionIsEqual = threefoldRepetitionEntry.position.board.flat().every(sq => this.chessGame.squareExists((s) => s.notation === sq.notation && s.piece?.color === sq.piece?.color && s.piece?.type === sq.piece?.type ))
            const legalMovesIsEqual = threefoldRepetitionEntry.position.legalMoves.length === newEntry.legalMoves.length && threefoldRepetitionEntry.position.legalMoves.every(move => newEntry.legalMoves.some(m => m.from.notation === move.from.notation && m.to.notation === move.to.notation && m.promotion === move.promotion && m.from.piece?.type === move.from.piece?.type && m.from.piece?.color === move.from.piece?.color))
            return boardPositionIsEqual && legalMovesIsEqual
        })

        

        if(index >= 0){
            this.threefoldRepetitionStack[index].timesReached++
        }else{
            this.threefoldRepetitionStack.push({
                position:newEntry,
                timesReached:1
            })
        }
    }

    threefoldRepetitionReached():boolean{
        return this.threefoldRepetitionStack.filter(entry => entry.timesReached >= 3).length > 0
    }

        
    
    async checkAndHandleSinglePlayerMove(): Promise<void> {
        if( this.checkShouldStopGame()) return

        if (this.gameConfig.gameMode.type === "SinglePlayerVsAi" && this.chessGame.playerTurn !== this.gameConfig.gameMode.playerColor && !this.result) {
            const aiMove = await this.gameConfig.gameMode.algorithmOption.getMove(this.chessGame,this.threefoldRepetitionStack, 0, 3)
            this.makePreCheckedMove(aiMove)
                this.checkShouldStopGame()

        }
    }


    checkShouldStopGame(): boolean {
        this.updateResult()
        return this.result != null
    }

    updateResult(): void {
        if (this.getLegalMoves().length === 0) {
            this.result = this.chessGame.ownKingInCheck() ? this.chessGame.playerTurn === PlayerColor.WHITE ? Result.BLACK_VICTORY : Result.WHITE_VICTORY : Result.DRAW
        }
        else if (this.chessGame.halfmoveClock >= 50) {
            this.result = Result.DRAW_50_MOVE_RULE
        }
        else if(this.threefoldRepetitionReached()){
            this.result = Result.DRAW_THREEFOLD_REPETITION
        }
    }

    async autoPlay(index: number) {
        if (index > 1000) return
        if (this.gameConfig.gameMode.type != "AiVsAi") return
        if (this.checkShouldStopGame()) return
        if (this.chessGame.playerTurn === PlayerColor.WHITE) {
            const whiteMove = await this.gameConfig.gameMode.algorithmOptions.white.getMove(this.chessGame,this.threefoldRepetitionStack, 0, 0)
            this.makePreCheckedMove(whiteMove)
        } else {
            const blackMove = await this.gameConfig.gameMode.algorithmOptions.black.getMove(this.chessGame,this.threefoldRepetitionStack, 0, 0)
            this.makePreCheckedMove(blackMove)
        }
        index += 1
        this.autoPlay(index)
    }

    private makePreCheckedMove(move: Move): void {
        this.chessGame.makeMove(move)
        this.pushToHistory(move)
        this.updateThreefoldRepetition()
    }


    private pushToHistory(move?: Move): void {
        this.history.push({
            game: this.chessGame.clone(),
            move: move ?? null
        })
    }

    private getBoardFromFen(): Board {
        let _board: Board = Array.from({ length: CHESS_BOARD_SIZE }, (_, y) => {
            return Array.from({ length: CHESS_BOARD_SIZE }, (_a, x) => {
                return { x, y, piece: null, notation: this.getNotation(x, y) }
            })
        }) as Board


        const boardString = this.fen.split(" ")[0]
        const rowString = boardString.split("/")

        const charToPieceType = (char: string): PieceType => {
            const lowercaseChar = char.toLowerCase()
            switch (lowercaseChar) {
                case "p": return PieceType.PAWN;
                case "r": return PieceType.ROOK;
                case "n": return PieceType.KNIGHT;
                case "b": return PieceType.BISHOP;
                case "q": return PieceType.QUEEN;
                case "k": return PieceType.KING;
                default: throw new Error('Fen char <' + char + '> is not a valid pieceType!')
            }
        }

        const parseRow = (row: string, currentCount: number, board: Board, rowIndex: number, fenIndex: number): void => {
            if (currentCount > CHESS_BOARD_SIZE) throw new Error('Out of bound in fen board parsing.')
            if (currentCount > CHESS_BOARD_MAX_INDEX) return

            const currentChar = row.charAt(fenIndex)

            if (isNaN(Number(currentChar))) {
                board[CHESS_BOARD_MAX_INDEX - rowIndex][currentCount].piece = {
                    color: currentChar == currentChar.toUpperCase() ? PlayerColor.WHITE : PlayerColor.BLACK,
                    type: charToPieceType(currentChar)
                }
                currentCount++
                fenIndex++
                return parseRow(row, currentCount, board, rowIndex, fenIndex)
            }

            const emptySquares = Number(currentChar)
            currentCount += emptySquares
            fenIndex++
            return parseRow(row, currentCount, board, rowIndex, fenIndex)
        }

        rowString.forEach((val, index) => parseRow(val, 0, _board, index, 0))

        return _board
    }

    private getPlayerTurnFromFen(): PlayerColor {
        return this.fen.split(" ")[1] === 'w' ? PlayerColor.WHITE : PlayerColor.BLACK
    }

    private getCastleRightsFromFen(): PlayerOption<CastleRights> {
        const castleRightsFen = this.fen.split(" ")[2]
        return {
            white: {
                queenSide: castleRightsFen.includes('Q'),
                kingSide: castleRightsFen.includes('K')
            },
            black: {
                queenSide: castleRightsFen.includes('q'),
                kingSide: castleRightsFen.includes('k')
            }
        }
    }

    private getEnPassantFromFen(): EnPassantTarget | null {
        const enPassantPart = this.fen.split(" ")[3]
        return enPassantPart === '-' ? null : enPassantPart as EnPassantTarget
    }

    private getHalfmoveClockFromFen(): number {
        return Number(this.fen.split(" ")[4])
    }

    private getFullmoveNumberFromFen(): number {
        return Number(this.fen.split(" ")[5])
    }

    private getBoardFen(): string {

        const pieceToFenChar = (piece: Piece): string => {
            let char
            switch (piece.type) {
                case PieceType.PAWN: char = 'p'; break;
                case PieceType.KNIGHT: char = 'n'; break;
                case PieceType.BISHOP: char = 'b'; break;
                case PieceType.ROOK: char = 'r'; break;
                case PieceType.QUEEN: char = 'q'; break;
                case PieceType.KING: char = 'k'; break;
                default: throw new Error('Invalid pieceType found in conversion to fen!')
            }

            return piece.color === PlayerColor.WHITE ? char.toUpperCase() : char
        }

        const parseRow = (squareIndex: number, row: Tuple<Square, ChessBoardSize>, emptyCounter: number): string => {
            if (squareIndex > CHESS_BOARD_SIZE) throw new Error('Index out of bounds while converting board to fen!')
            if (squareIndex > CHESS_BOARD_MAX_INDEX) return '' + (emptyCounter > 0 ? (emptyCounter + '') : '')
            const square = row[squareIndex]
            squareIndex++
            if (square.piece) return (emptyCounter > 0 ? (emptyCounter + '') : '') + pieceToFenChar(square.piece) + parseRow(squareIndex, row, 0)
            emptyCounter++
            return parseRow(squareIndex, row, emptyCounter)
        }

        return [...this.chessGame.board].reverse().map((row) => parseRow(0, row, 0)).reduce((a, c) => a + (a.length > 0 ? '/' : '') + c, '')
    }

    private getPlayerFen(): string {
        return this.chessGame.playerTurn === PlayerColor.WHITE ? 'w' : 'b'
    }

    private getCastleRightsFen(): string {
        const _castleRights = this.chessGame.castleRights
        if (!(_castleRights.black.kingSide || _castleRights.black.queenSide || _castleRights.white.kingSide || _castleRights.white.queenSide)) {
            return '-'
        }
        let _castleRightsFen = ''
        _castleRightsFen += (_castleRights.white.kingSide) ? 'K' : ''
        _castleRightsFen += (_castleRights.white.queenSide) ? 'Q' : ''
        _castleRightsFen += (_castleRights.black.kingSide) ? 'k' : ''
        _castleRightsFen += (_castleRights.black.queenSide) ? 'q' : ''
        return _castleRightsFen
    }

    private getEnPassantFen(): string {
        return this.chessGame.enPassant == null ? '-' : this.chessGame.enPassant
    }

    private getHalfmoveClockFen(): string {
        return this.chessGame.halfmoveClock + ''
    }

    private getFullmoveNumberFen(): string {
        return this.chessGame.fullmoveNumber + ''
    }

    private getNotation(x: number, y: number) {
        let notation = ''
        switch (x) {
            case 0: notation = 'a'; break;
            case 1: notation = 'b'; break;
            case 2: notation = 'c'; break;
            case 3: notation = 'd'; break;
            case 4: notation = 'e'; break;
            case 5: notation = 'f'; break;
            case 6: notation = 'g'; break;
            case 7: notation = 'h'; break;
            default: throw new Error('Notation x index out of bound: ' + x)
        }
        if (y < CHESS_BOARD_MIN_INDEX || y > CHESS_BOARD_MAX_INDEX) throw new Error('Notation y index out of bound: ' + y)
        notation += (y + 1)
        return notation
    }

}