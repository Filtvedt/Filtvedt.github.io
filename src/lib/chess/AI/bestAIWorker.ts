import {
    type AiWorkerMessage,
    AiWorkerResponseType,
    type Move,
    type Node,
    type ScoredMove,
    type ThreefoldRepetitionEntry,
    type ThreefoldRepetitionPosition,
    WorkerCommand
} from "../types";
import {BestEvaluatorV1} from "../score/bestScorerV1";
import {ChessGame} from "../ChessGame";
import {actionSorting, NEGATIVE_SCORE_INFINITY, SCORE_INFINITY} from "../gameUtils";

var alpha = NEGATIVE_SCORE_INFINITY
var beta = SCORE_INFINITY

const minMax = (node: Node, depth: number, maximizingPlayer: boolean, maxDepth: number,workerId:number): number | ScoredMove => {


    if (depth === 0 || node.chessGame.getLegalMoves().length === 0) {
        return evalGame(node, depth === 0 ? (depth + 1) : depth)
    }


    if (maximizingPlayer) {
        let maxEvaluation: number = NEGATIVE_SCORE_INFINITY
        let bestMove = null
        for (let [index, move] of node.chessGame.getLegalMoves().sort(actionSorting).entries()) {
            const nextNode = asNode(node, move)
            const evaluation = minMax(nextNode, (depth - 1), false, maxDepth, workerId)
            const e = evaluation as ScoredMove
            const moveScore = e.score ?? e
            if (moveScore > maxEvaluation) bestMove = move
            else if (moveScore == maxEvaluation) bestMove = (Math.floor(Math.random() * 2)) ? bestMove : move
            maxEvaluation = Math.max(maxEvaluation, moveScore)
            const newAlpha = Math.max(alpha, maxEvaluation)
            if(newAlpha > alpha){
                postMessage({type:WorkerCommand.UpdateAlpha,payload:{alpha:newAlpha}})
            }
            alpha = newAlpha
            if (beta <= alpha) {
                const skippedMoves = (node.chessGame.getLegalMoves().length - (index + 1))
                addSkips(depth - 1, skippedMoves)
                break
            }

        }

        return {score: maxEvaluation, move: bestMove}
    } else {
        let minEvaluation: number = SCORE_INFINITY
        let bestMove = null
        for (let [index, move] of node.chessGame.getLegalMoves().sort(actionSorting).entries()) {
            const nextNode = asNode(node, move)
            const evaluation = minMax(nextNode, (depth - 1), true, maxDepth, workerId)
            const e = evaluation as ScoredMove
            const moveScore = e.score ?? e
            if (moveScore < minEvaluation) bestMove = move
            else if (moveScore == minEvaluation) bestMove = (Math.floor(Math.random() * 2)) ? bestMove : move
            minEvaluation = Math.min(minEvaluation, moveScore)
            const newBeta = Math.min(beta, moveScore)
            if(newBeta < beta){
                postMessage({type:WorkerCommand.UpdateBeta,payload:{beta:newBeta}})
            }
            beta = newBeta
            if (beta <= alpha) {
                const skippedMoves = (node.chessGame.getLegalMoves().length - (index + 1))
                addSkips(depth - 1, skippedMoves)
                break;
            }
        }
        return {score: minEvaluation, move: bestMove}
    }
}


const addSkips = (depth: number, skips: number): void => {
    //TODO
    // if (!(this.skips[depth])) {
    //     this.skips[depth] = skips
    //     return
    // }
    // this.skips[depth] += skips
}

const evalGame = (node: Node, depth: number): number => {
    return new BestEvaluatorV1().getScore(node.chessGame, node.threefoldRepetitionStack, depth)
}

const updateThreefoldRepetition = (chessGame: ChessGame, threefoldRepetitionStack: ThreefoldRepetitionEntry[]): ThreefoldRepetitionEntry[] => {
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

const asNode = (parrentNode: Node, move: Move): Node => {
    const clone = parrentNode.chessGame.clone()
    let cloneStack: ThreefoldRepetitionEntry[] = JSON.parse(JSON.stringify(parrentNode.threefoldRepetitionStack))
    clone.makeMove(move)
    cloneStack = updateThreefoldRepetition(clone, cloneStack)
    return {chessGame: clone, threefoldRepetitionStack: cloneStack}
}


self.addEventListener("message", (e:MessageEvent<AiWorkerMessage>) => {

    switch (e.data.command){
        case WorkerCommand.Start:{
            let {move,topNode,maxDepth, isMaximizingPlayer,legalMoves, index}:{move:Move,topNode:Node,maxDepth:number,isMaximizingPlayer:boolean,legalMoves: Move[], index:number} = e.data.payload
            console.log("Starting worker " + index + " to evaluate move", move)

            topNode.chessGame = new ChessGame(topNode.chessGame.board,topNode.chessGame.playerTurn,topNode.chessGame.castleRights,topNode.chessGame.enPassant,topNode.chessGame.halfmoveClock,topNode.chessGame.fullmoveNumber,topNode.chessGame.attacks,legalMoves)

            const myThreadNode = asNode(topNode, move)

            const result:ScoredMove = minMax(myThreadNode, maxDepth, !isMaximizingPlayer, maxDepth, index) as ScoredMove

            console.log("Worker " + index + " done", result)

            result.move = move
            postMessage({type:AiWorkerResponseType.Complete, payload:result})
            break
        }
        case WorkerCommand.Reset:{
            alpha = NEGATIVE_SCORE_INFINITY
            beta = SCORE_INFINITY
            break
        }
        case WorkerCommand.UpdateAlpha:{
            alpha = Math.max(e.data.payload.alpha, alpha)
            break
        }
        case WorkerCommand.UpdateBeta:{
            beta = Math.min(e.data.payload.beta, beta)
            break
        }

    }


});