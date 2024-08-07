import { takeABreakForTheUiToRunShallWe } from "../../utils/scheduler";
import type { ChessGame } from "../ChessGame";
import { NEGATIVE_SCORE_INFINITY, SCORE_INFINITY, actionSorting } from "../gameUtils";
import { PlayerColor, type AI, type BoardScorer, type Move, type ScoredMove, type ThreefoldRepetitionEntry, type ThreefoldRepetitionPosition, type Node } from "../types";





export class BestAiV1 implements AI {
    boardScorer: BoardScorer;
    skips: any = {}
    evaluatedPositions: number = 0


    constructor(boardScorer: BoardScorer) {
        this.boardScorer = boardScorer
        this.evaluatedPositions = 0
    }

    
    async getMove(chessGame: ChessGame, threefoldRepetitionStack: ThreefoldRepetitionEntry[], remaningSeconds: number, maxDepth: number): Promise<Move> {
        this.evaluatedPositions = 0
        let alpha = NEGATIVE_SCORE_INFINITY
        let beta = SCORE_INFINITY
        const topNode: Node = { chessGame: chessGame.clone(), threefoldRepetitionStack: JSON.parse(JSON.stringify(threefoldRepetitionStack)) }
        const moveScore = await this.minMax(topNode, maxDepth, alpha, beta, topNode.chessGame.playerTurn != chessGame.playerTurn, maxDepth) as ScoredMove

        console.log("Evaluation complete! Alpha-Beta Pruning :" , this.skips ," Best found move:" , moveScore.move, "Total evaluated moves:" + this.evaluatedPositions )

        return moveScore.move as Move
    }


    async minMax(node: Node, depth: number, alpha: number, beta: number, maximizingPlayer: boolean, maxDepth: number): Promise<number | ScoredMove> {
        await takeABreakForTheUiToRunShallWe(); 
       
        if (depth === 0 || node.chessGame.getLegalMoves().length === 0) {
            this.evaluatedPositions++
            return this.evalGame(node, depth === 0 ? (depth + 1) : depth)
        }



        if (maximizingPlayer) {
            let maxEvaluation: number = NEGATIVE_SCORE_INFINITY
            let bestMove = null
            for (let [index, move] of node.chessGame.getLegalMoves().sort(actionSorting).entries()) {
                const nextNode = this.asNode(node, move)
                const evaluation = await this.minMax(nextNode, (depth - 1), alpha, beta, false, maxDepth)
                const e = evaluation as ScoredMove
                const moveScore = e.score ?? e
                if (moveScore > maxEvaluation) bestMove = move
                else if(moveScore == maxEvaluation) bestMove = (Math.floor(Math.random() * 2)) ? bestMove : move
                maxEvaluation = Math.max(maxEvaluation, moveScore)
                alpha = Math.max(alpha, maxEvaluation)
                if (beta <= alpha) {
                    const skippedMoves = (node.chessGame.getLegalMoves().length - (index + 1))
                    this.addSkips(depth - 1, skippedMoves)
                    break
                }

            }

            return { score: maxEvaluation, move: bestMove }
        } else {
            let minEvaluation: number = SCORE_INFINITY
            let bestMove = null
            for (let [index, move] of node.chessGame.getLegalMoves().sort(actionSorting).entries()) {
                const nextNode = this.asNode(node, move)
                const evaluation = await this.minMax(nextNode, (depth - 1), alpha, beta, true, maxDepth)
                const e = evaluation as ScoredMove
                const moveScore = e.score ?? e
                if (moveScore < minEvaluation) bestMove = move
                else if(moveScore == minEvaluation) bestMove = (Math.floor(Math.random() * 2)) ? bestMove : move
                minEvaluation = Math.min(minEvaluation, moveScore)
                beta = Math.min(beta, moveScore)
                if (beta <= alpha) {
                    const skippedMoves = (node.chessGame.getLegalMoves().length - (index + 1))
                    this.addSkips(depth - 1, skippedMoves)
                    break;
                }
            }
            return { score: minEvaluation, move: bestMove }
        }
    }



    addSkips(depth: number, skips: number): void {
        if (!(this.skips[depth])) {
            this.skips[depth] = skips
            return
        }

        this.skips[depth] += skips
    }



    evalGame(node: Node, depth: number): number {
        return this.boardScorer.getScore(node.chessGame, node.threefoldRepetitionStack, depth)
    }

    asNode(parrentNode: Node, move: Move): Node {
        const clone = parrentNode.chessGame.clone()
        let cloneStack: ThreefoldRepetitionEntry[] = JSON.parse(JSON.stringify(parrentNode.threefoldRepetitionStack))
        clone.makeMove(move)
        cloneStack = this.updateThreefoldRepetition(clone, cloneStack)
        return { chessGame: clone, threefoldRepetitionStack: cloneStack }
    }

    moveToString(move?: Move): string {
        if (!move) return ''
        return "(" + move.from.piece.type + ") " + move.from.notation + " -> " + move.to.notation
    }

    updateThreefoldRepetition(chessGame: ChessGame, threefoldRepetitionStack: ThreefoldRepetitionEntry[]): ThreefoldRepetitionEntry[] {
        let newEntry: ThreefoldRepetitionPosition = {
            board: chessGame.board,
            legalMoves: chessGame.getLegalMoves()
        }
        const index = threefoldRepetitionStack.findIndex(threefoldRepetitionEntry => {
            const boardPositionIsEqual = threefoldRepetitionEntry.position.board.flat().every(sq => chessGame.squareExists((s) => s.notation === sq.notation && s.piece?.color === sq.piece?.color && s.piece?.type === sq.piece?.type))
            const legalMovesIsEqual = threefoldRepetitionEntry.position.legalMoves.length === newEntry.legalMoves.length && threefoldRepetitionEntry.position.legalMoves.every(move => newEntry.legalMoves.some(m => m.from.notation === move.from.notation && m.to.notation === move.to.notation && m.promotion === move.promotion && m.from.piece?.type === move.from.piece?.type && m.from.piece?.color === move.from.piece?.color))
            return boardPositionIsEqual && legalMovesIsEqual
        })

        if (index >= 0) {
            threefoldRepetitionStack[index].timesReached++
        } else {
            threefoldRepetitionStack.push({
                position: newEntry,
                timesReached: 1
            })
        }

        return threefoldRepetitionStack
    }


}