import { CHESS_BOARD_MAX_INDEX, CHESS_BOARD_MIN_INDEX, directionIncrementer, playerOptionKeyFromPlayerColor } from "./gameUtils";
import { type Board, type ChessBoardSize, type Square, PlayerColor, PieceType, type Tuple, type Piece, type CastleRights, type PlayerOption, type EnPassantTarget, type Move, type Attack, type Predicate, type NonNullableFields, type Coordinate, Direction, Result } from "./types";

export class ChessGame {
    board: Board
    playerTurn: PlayerColor
    castleRights: PlayerOption<CastleRights>
    enPassant: EnPassantTarget | null
    halfmoveClock: number
    fullmoveNumber: number
    attacks: PlayerOption<Attack[]>
    private legalMoves: Move[]



    constructor(board: Board,
        playerTurn: PlayerColor,
        castleRights: PlayerOption<CastleRights>,
        enPassant: EnPassantTarget | null,
        halfmoveClock: number,
        fullmoveNumber: number,
        attacks?: PlayerOption<Attack[]>,
        legalMoves?: Move[]) {
        this.legalMoves = legalMoves ?? []
        this.board = board
        this.playerTurn = playerTurn
        this.castleRights = castleRights
        this.enPassant = enPassant
        this.halfmoveClock = halfmoveClock
        this.fullmoveNumber = fullmoveNumber
        this.attacks = attacks ?? { white: [], black: [] }
        this.attacks = this.getAttacks()
        if(!legalMoves){
            this.updateLegalMoves()
        }
    }

    getLegalMoves(): Move[] {
        return this.legalMoves
    }

    updateLegalMoves(): void {
        this.legalMoves = this.board.map(row =>
            row.filter(square => square.piece != null && square.piece.color === this.playerTurn)
                .map(square => this.getLegalMovesForPiece(square))
        ).flat(2).filter(move => !this.kingIsInCheck(move))
    }


    makeMove(move: Move,skipUpdateLegalMoves?:boolean) {
        //General rules
        this.board[move.from.y][move.from.x] = { ...this.board[move.from.y][move.from.x], piece: null }
        this.board[move.to.y][move.to.x] = { ...this.board[move.to.y][move.to.x], piece: move.from.piece }
        this.playerTurn = this.playerTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE
        this.halfmoveClock = move.from.piece.type === PieceType.PAWN || move.to.piece != null ? 0 : this.halfmoveClock + 1
        if (move.from.piece.color === PlayerColor.BLACK) this.fullmoveNumber++

        //Handle special moves 
        if (this.isCastlingMove(move)) {
            this.completeCastleMove(move)
        }

        if (this.isEnPassantCapture(move)) {
            this.completeEnPassantCapture(move)
        }

        if (move.promotion) {
            this.board[move.to.y][move.to.x] = { ...this.board[move.to.y][move.to.x], piece: { ...move.from.piece, type: move.promotion } }
        }

        //Update the game state
        this.updateEnPassantTarget(move)
        this.updateCastleRights(move)
        this.updateAttacks()
        if(!skipUpdateLegalMoves) this.updateLegalMoves()
    }

    private updateEnPassantTarget(move: Move): void {
        this.enPassant = move.from.piece.type === PieceType.PAWN && Math.abs(move.from.y - move.to.y) === 2 ? move.to.notation as EnPassantTarget : null
    }

    private updateCastleRights(move: Move): void {
        const color = move.from.piece.color
        const key = playerOptionKeyFromPlayerColor(color)

        //If king move player of that color loses both CastleRights
        if (move.from.piece.type === PieceType.KING) {
            this.castleRights[key] = {
                queenSide: false,
                kingSide: false
            }
        }

        //If rook remove CastleRights based on move.from.x (0 for queenSide, 7 for kingSide)
        if (move.from.piece.type === PieceType.ROOK) {
            this.castleRights[key] = {
                queenSide: move.from.x === CHESS_BOARD_MIN_INDEX ? false : this.castleRights[key].queenSide,
                kingSide: move.from.x === CHESS_BOARD_MAX_INDEX ? false : this.castleRights[key].kingSide
            }
        }

       if(move.to.notation === 'a1') this.castleRights.white.queenSide = false
       if(move.to.notation === 'h1') this.castleRights.white.kingSide = false
       if(move.to.notation === 'a8') this.castleRights.black.queenSide = false
       if(move.to.notation === 'h8') this.castleRights.black.kingSide = false


    }

    private completeCastleMove(move: Move): void {
        const x = move.to.x
        if (x != 2 && x != 6) throw new Error("Invalid castle move, x index is " + x)
        const y = move.from.piece.color === PlayerColor.WHITE ? CHESS_BOARD_MIN_INDEX : CHESS_BOARD_MAX_INDEX
        const oldRookXIndex = x === 2 ? 0 : 7
        this.board[y][oldRookXIndex] = { ...this.board[y][oldRookXIndex], piece: null }
        const rookXIndex = x === 2 ? 3 : 5
        this.board[y][rookXIndex] = { ...this.board[y][rookXIndex], piece: { type: PieceType.ROOK, color: move.from.piece.color } }
    }

    private completeEnPassantCapture(move: Move): void {
        const x = move.to.x
        const y = move.from.y
        this.board[y][x] = { ...this.board[y][x], piece: null }
    }

    private isPawnPushMove(move: Move): boolean {
        return move.from.piece.type === PieceType.PAWN && move.from.y != move.to.y && move.from.x === move.to.x
    }

    private isEnPassantCapture(move: Move): boolean {
        return move.from.piece.type === PieceType.PAWN &&
            move.from.x != move.to.x &&
            move.to.piece == null
    }

    private isCastlingMove(move: Move): boolean {
        if (!(move.from.piece?.type === PieceType.KING)) return false
        return move.from.piece.color === PlayerColor.WHITE ?
            ((move.to.notation === 'g1' && move.from.notation === 'e1') || (move.to.notation === 'c1' && move.from.notation === 'e1')) :
            ((move.to.notation === 'g8' && move.from.notation === 'e8') || (move.to.notation === 'c8' && move.from.notation === 'e8'))
    }

    private getAttacks(): PlayerOption<Attack[]> {
        this.updateAttacks()
        return this.attacks
    }


    private updateAttacks(): void {
        const allAttacks: Attack[] = this.board.map(row => row.map(_square => {
            if (_square.piece === null) return []
            const square = _square as NonNullableFields<Square>
            return this.getAttacksForPiece(square)
        })).flat(2)
        this.attacks.white = allAttacks.filter(attack => attack.attacker.piece.color === PlayerColor.WHITE)
        this.attacks.black = allAttacks.filter(attack => attack.attacker.piece.color === PlayerColor.BLACK)
    }

    private oppesideKingInCheck(): boolean {
        return this.kingInCheck(this.playerTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)
    }
    ownKingInCheck(): boolean {
        return this.kingInCheck(this.playerTurn)
    }

    kingInCheck(playerColor: PlayerColor): boolean {
        const kingSquare: Square = this.findSquare((s) => s.piece != null && s.piece.type === PieceType.KING && s.piece.color === playerColor)
        const attackList = playerColor === PlayerColor.WHITE ? this.attacks.black : this.attacks.white
        return attackList.some(attack => attack.attackTarget.notation === kingSquare.notation)
    }

    private kingIsInCheck(move: Move): boolean {
        const clone = this.clone()
        clone.makeMove(move,true)
        return clone.oppesideKingInCheck()
    }


    getAttacksForPiece(square: Square): Attack[] {
        if (square.piece === null) return []
        const _square: NonNullableFields<Square> = square as NonNullableFields<Square>
        switch (square.piece.type) {
            case PieceType.PAWN: return this.getDirectPawnAttacks(_square)
            case PieceType.KNIGHT: return this.getDirectKnightAttacks(_square)
            case PieceType.BISHOP: return this.getDirectBishopAttacks(_square)
            case PieceType.ROOK: return this.getDirectRookAttacks(_square)
            case PieceType.QUEEN: return this.getDirectQueenAttacks(_square)
            case PieceType.KING: return this.getDirectKingAttacks(_square)
        }

    }

    getDirectKingAttacks(square: NonNullableFields<Square>): Attack[] {
        const directions: Direction[] = [Direction.east, Direction.west, Direction.north, Direction.south, Direction.northEast, Direction.northWest, Direction.southEast, Direction.southWest]
        const includeCondition: Predicate<Square> = (s) => true
        const stopCondition: Predicate<Square> = (s) => true
        const squares = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()
        return squares.map(_square => { return { attackTarget: _square, attacker: { piece: square.piece, pieceSquare: square } } })
    }


    getDirectQueenAttacks(square: NonNullableFields<Square>): Attack[] {
        return this.getDirectBishopAttacks(square).concat(this.getDirectRookAttacks(square))
    }

    getDirectRookAttacks(square: NonNullableFields<Square>): Attack[] {
        const includeCondition: Predicate<Square> = s => true
        const stopCondition: Predicate<Square> = s => s.piece != null
        const directions: Direction[] = [Direction.east, Direction.west, Direction.south, Direction.north]
        const squares: Square[] = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()
        return squares.map(_square => { return { attackTarget: _square, attacker: { piece: square.piece, pieceSquare: square } } })
    }

    getDirectBishopAttacks(square: NonNullableFields<Square>): Attack[] {
        const includeCondition: Predicate<Square> = s => true
        const stopCondition: Predicate<Square> = s => s.piece != null
        const directions: Direction[] = [Direction.northEast, Direction.northWest, Direction.southEast, Direction.southWest]
        const squares: Square[] = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()
        return squares.map(_square => { return { attackTarget: _square, attacker: { piece: square.piece, pieceSquare: square } } })
    }

    getDirectKnightAttacks(square: NonNullableFields<Square>): Attack[] {
        const includeCondition: Predicate<Square> = s => true
        return this.getKnightMoves(square, includeCondition).map(_square => { return { attackTarget: _square, attacker: { piece: square.piece, pieceSquare: square } } })
    }

    getDirectPawnAttacks(square: NonNullableFields<Square>): Attack[] {
        let _squares: Square[] = []

        if (square.piece.color === PlayerColor.WHITE) {
            if (square.y + 1 <= CHESS_BOARD_MAX_INDEX && square.x + 1 <= CHESS_BOARD_MAX_INDEX) _squares.push(this.board[square.y + 1][square.x + 1])
            if (square.y + 1 <= CHESS_BOARD_MAX_INDEX && square.x - 1 >= CHESS_BOARD_MIN_INDEX) _squares.push(this.board[square.y + 1][square.x - 1])
        }

        else if (square.piece.color === PlayerColor.BLACK) {
            if (square.y - 1 >= CHESS_BOARD_MIN_INDEX && square.x + 1 <= CHESS_BOARD_MAX_INDEX) _squares.push(this.board[square.y - 1][square.x + 1])
            if (square.y - 1 >= CHESS_BOARD_MIN_INDEX && square.x - 1 >= CHESS_BOARD_MIN_INDEX) _squares.push(this.board[square.y - 1][square.x - 1])
        }

        return _squares.map(toSquare => {
            return {
                attackTarget: toSquare,
                attacker: {
                    piece: square.piece,
                    pieceSquare: square
                }
            }
        })
    }

    getLegalMovesForPiece(square: Square): Move[] {
        if (square.piece === null) return []
        const _square: NonNullableFields<Square> = square as NonNullableFields<Square>
        switch (square.piece.type) {
            case PieceType.PAWN: return this.getLegalPawnMoves(_square)
            case PieceType.KNIGHT: return this.getLegalKnightMoves(_square)
            case PieceType.BISHOP: return this.getLegalBishopMoves(_square)
            case PieceType.ROOK: return this.getLegalRookMoves(_square)
            case PieceType.QUEEN: return this.getLegalQueenMoves(_square)
            case PieceType.KING: return this.getLegalKingMoves(_square)
        }
    }

    private getLegalPawnMoves(square: NonNullableFields<Square>): Move[] {
        let _squares: Square[] = []
        if (square.piece.color === PlayerColor.WHITE) {
            if (square.y + 1 <= CHESS_BOARD_MAX_INDEX && this.board[square.y + 1][square.x].piece == null) _squares.push(this.board[square.y + 1][square.x])
            if (square.y + 1 <= CHESS_BOARD_MAX_INDEX && square.x + 1 <= CHESS_BOARD_MAX_INDEX && (this.board[square.y + 1][square.x + 1].piece?.color === PlayerColor.BLACK || this.board[square.y][square.x + 1].notation === this.enPassant)) _squares.push(this.board[square.y + 1][square.x + 1])
            if (square.y + 1 <= CHESS_BOARD_MAX_INDEX && square.x - 1 >= CHESS_BOARD_MIN_INDEX && (this.board[square.y + 1][square.x - 1].piece?.color === PlayerColor.BLACK || this.board[square.y][square.x - 1].notation === this.enPassant)) _squares.push(this.board[square.y + 1][square.x - 1])
            if (square.y === 1 && this.board[square.y + 1][square.x].piece == null && this.board[square.y + 2][square.x].piece == null) _squares.push(this.board[square.y + 2][square.x])
        }
        else if (square.piece.color === PlayerColor.BLACK) {
            if (square.y - 1 >= CHESS_BOARD_MIN_INDEX && this.board[square.y - 1][square.x].piece == null) _squares.push(this.board[square.y - 1][square.x])
            if (square.y - 1 >= CHESS_BOARD_MIN_INDEX && square.x + 1 <= CHESS_BOARD_MAX_INDEX && (this.board[square.y - 1][square.x + 1].piece?.color === PlayerColor.WHITE || this.board[square.y][square.x + 1].notation === this.enPassant)) _squares.push(this.board[square.y - 1][square.x + 1])
            if (square.y - 1 >= CHESS_BOARD_MIN_INDEX && square.x - 1 >= CHESS_BOARD_MIN_INDEX && (this.board[square.y - 1][square.x - 1].piece?.color === PlayerColor.WHITE || this.board[square.y][square.x - 1].notation === this.enPassant)) _squares.push(this.board[square.y - 1][square.x - 1])
            if (square.y === 6 && this.board[square.y - 1][square.x].piece == null && this.board[square.y - 2][square.x].piece == null) _squares.push(this.board[square.y - 2][square.x])
        }

        const promotions = _squares.filter(s => (square.piece.color === PlayerColor.WHITE && s.y === CHESS_BOARD_MAX_INDEX) ||
            (square.piece.color === PlayerColor.BLACK && s.y === CHESS_BOARD_MIN_INDEX))

        const regular = _squares.filter(s => !(promotions.some(p => p.notation === s.notation)))

        const mappedPromotions: Move[] = promotions.map(p => {
            const promotionTypes: (PieceType.BISHOP | PieceType.KNIGHT | PieceType.ROOK | PieceType.QUEEN)[] = [PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK, PieceType.QUEEN]
            return promotionTypes.map(pieceType => {
                return {
                    from: square,
                    to: p,
                    promotion: pieceType
                }
            })
        }).flat(2)

        const mappedRegular: Move[] = regular.map(toSquare => {

            return {
                from: square,
                to: toSquare
            }
        })

        return mappedPromotions.concat(mappedRegular)
    }

    private getLegalKnightMoves(square: NonNullableFields<Square>): Move[] {
        const includeCondition: Predicate<Square> = s => s.piece == null || s.piece.color != square.piece.color
        return this.getKnightMoves(square, includeCondition).map(toSquare => {
            return {
                from: square,
                to: toSquare
            }
        })
    }

    private getLegalBishopMoves(square: NonNullableFields<Square>): Move[] {
        const directions: Direction[] = [Direction.northEast, Direction.northWest, Direction.southEast, Direction.southWest]
        const includeCondition: Predicate<Square> = s => s.piece == null || s.piece.color != square.piece.color
        const stopCondition: Predicate<Square> = s => s.piece != null
        const squares = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()
        return squares.map(toSquare => {
            return {
                from: square,
                to: toSquare
            }
        })
    }

    private getLegalRookMoves(square: NonNullableFields<Square>): Move[] {
        const directions: Direction[] = [Direction.east, Direction.west, Direction.north, Direction.south]
        const includeCondition: Predicate<Square> = (s) => s.piece == null || s.piece.color != square.piece.color
        const stopCondition: Predicate<Square> = (s) => s.piece != null
        const squares = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()
        return squares.map(toSquare => {
            return {
                from: square,
                to: toSquare
            }
        })
    }

    private getLegalQueenMoves(square: NonNullableFields<Square>): Move[] {
        return this.getLegalBishopMoves(square).concat(this.getLegalRookMoves(square))
    }


    private canCastleQueenSide(square: NonNullableFields<Square>): boolean {
        return (square.piece.color === PlayerColor.WHITE &&
            this.castleRights.white.queenSide &&
            square.notation === 'e1' &&
            this.board[0][1].piece == null &&
            this.board[0][2].piece == null &&
            this.board[0][3].piece == null &&
            !this.kingInCheck(PlayerColor.WHITE) &&
            !this.attacks.black.some(attack => attack.attackTarget.y === CHESS_BOARD_MIN_INDEX && [1, 2, 3].some(i => i === attack.attackTarget.x)))
            ||
            (square.piece.color === PlayerColor.BLACK &&
                this.castleRights.black.queenSide &&
                square.notation === 'e8' &&
                this.board[7][1].piece == null &&
                this.board[7][2].piece == null &&
                this.board[7][3].piece == null &&
                !this.kingInCheck(PlayerColor.BLACK) &&
                !this.attacks.white.some(attack => attack.attackTarget.y === CHESS_BOARD_MAX_INDEX && [1, 2, 3].some(i => i === attack.attackTarget.x)))

    }

    private canCastleKingSide(square: NonNullableFields<Square>): boolean {
        return (square.piece.color === PlayerColor.WHITE &&
            this.castleRights.white.kingSide &&
            square.notation === 'e1' &&
            this.board[0][5].piece == null &&
            this.board[0][6].piece == null &&
            !this.kingInCheck(PlayerColor.WHITE) &&
            !this.attacks.black.some(attack => attack.attackTarget.y === CHESS_BOARD_MIN_INDEX && [5, 6].some(i => i === attack.attackTarget.x)))
            ||
            (square.piece.color === PlayerColor.BLACK &&
                this.castleRights.black.kingSide &&
                square.notation === 'e8' &&
                this.board[7][5].piece == null &&
                this.board[7][6].piece == null &&
                !this.kingInCheck(PlayerColor.BLACK) &&
                !this.attacks.white.some(attack => attack.attackTarget.y === CHESS_BOARD_MAX_INDEX && [5, 6].some(i => i === attack.attackTarget.x)))

    }

    private getLegalKingMoves(square: NonNullableFields<Square>): Move[] {

        const directions: Direction[] = [Direction.east, Direction.west, Direction.north, Direction.south, Direction.northEast, Direction.northWest, Direction.southEast, Direction.southWest]

        const includeCondition: Predicate<Square> = (s) => s.piece == null || s.piece.color != square.piece.color
        const stopCondition: Predicate<Square> = (s) => true
        const squares = directions.map(direction => this.getSquaresUntilCondition(square, directionIncrementer[direction], includeCondition, stopCondition)).flat()


        let castleMoves = []
        if (this.canCastleKingSide(square)) castleMoves.push(this.board[square.piece.color === PlayerColor.WHITE ? CHESS_BOARD_MIN_INDEX : CHESS_BOARD_MAX_INDEX][6])
        if (this.canCastleQueenSide(square)) castleMoves.push(this.board[square.piece.color === PlayerColor.WHITE ? CHESS_BOARD_MIN_INDEX : CHESS_BOARD_MAX_INDEX][2])
        return squares.concat(castleMoves)
            .map(toSquare => {
                return {
                    from: square,
                    to: toSquare
                }
            })
    }

    private coordinateInsideBoard(coordinate: Coordinate): boolean {
        return coordinate.x >= CHESS_BOARD_MIN_INDEX && coordinate.x <= CHESS_BOARD_MAX_INDEX && coordinate.y >= CHESS_BOARD_MIN_INDEX && coordinate.y <= CHESS_BOARD_MAX_INDEX
    }

    private getKnightMoves(square: Square, includeCondition: Predicate<Square>): Square[] {
        let coorinates: Coordinate[] = [
            { x: square.x + 2, y: square.y + 1 },
            { x: square.x + 2, y: square.y - 1 },
            { x: square.x - 2, y: square.y + 1 },
            { x: square.x - 2, y: square.y - 1 },
            { x: square.x + 1, y: square.y + 2 },
            { x: square.x + 1, y: square.y - 2 },
            { x: square.x - 1, y: square.y + 2 },
            { x: square.x - 1, y: square.y - 2 },
        ].filter(this.coordinateInsideBoard)

        return coorinates.map(coordinate => this.board[coordinate.y][coordinate.x]).filter(includeCondition)
    }

    getSquaresUntilCondition(startingPosition: Square, increments: Coordinate, includeCondition: Predicate<Square>, stopCondition: Predicate<Square>): Square[] {
        let c: Coordinate = {
            x: startingPosition.x + increments.x,
            y: startingPosition.y + increments.y
        }
        let squares = []
        while (this.coordinateInsideBoard(c)) {
            const square = this.board[c.y][c.x]
            if (includeCondition(square)) squares.push(square)
            if (stopCondition(square)) break;
            c.x += increments.x
            c.y += increments.y
        }
        return squares
    }



    clone(): ChessGame {
        return new ChessGame(JSON.parse(JSON.stringify(this.board)),
            JSON.parse(JSON.stringify(this.playerTurn)),
            JSON.parse(JSON.stringify(this.castleRights)),
            JSON.parse(JSON.stringify(this.enPassant)),
            JSON.parse(JSON.stringify(this.halfmoveClock)),
            JSON.parse(JSON.stringify(this.fullmoveNumber)),
            JSON.parse(JSON.stringify(this.attacks)),
            JSON.parse(JSON.stringify(this.legalMoves)))
    }

    squareExists(predicate: Predicate<Square>): boolean {
        return this.findSquares(predicate).length > 0
    }

    findSquare(predicate: Predicate<Square>): Square {
        const squares = this.findSquares(predicate)
        if (squares.length === 0 || squares.length > 1) throw new Error('Find square makes the assumption that the search should return one, and only one result, but number of restults where/was ' + JSON.stringify(squares))
        return squares[0]
    }

    private findSquares(predicate: Predicate<Square>): Square[] {
        return this.board.map(row => row.filter(predicate)).flat(2)
    }


}