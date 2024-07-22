<script lang="ts">
    import { GameManager } from "./GameManager";
    import { type Move } from "./types";
    import Board from "./Board.svelte";
    import type { ChessGame } from "./ChessGame";
    import GameHistory from "./GameHistory.svelte";
    import { tick } from "svelte";

    export let gameManager: GameManager;

    let playerColor = gameManager.gameConfig.gameMode.playerColor;
    let currentGame: ChessGame = gameManager.chessGame;

    const handleMove = async (move: Move) => {
        gameManager.makeMove(move);
        await refresh();
        
    };

    const refresh = async (): Promise<void> => {
        currentGame = gameManager.chessGame;
        gameManager = gameManager;
        await tick();
    };

    let boardSize = 800;

    const handleManualMoveEvent = (event: CustomEvent<Move>): void => {
        handleManualMove(event);
    };

    const handleManualMove = async (
        event: CustomEvent<Move>,
    ): Promise<void> => {
        const move: Move = event.detail;
        if (gameManager.gameConfig.gameMode.type === "AiVsAi") return;
        if (currentGame.playerTurn != move.from.piece.color){
            return;
        }
        await handleMove(move);
      
            gameManager.checkAndHandleSinglePlayerMove().then((_) => refresh());
       
    };

    const handleHistorySelected = (event: CustomEvent<ChessGame>) => {
        currentGame = event.detail;
    };


</script>

{#key gameManager.chessGame.playerTurn}
    <div>
        {"Player turn = " + gameManager.chessGame.playerTurn}
        {"Result = " + gameManager.result}
        {"Moves = " + gameManager.chessGame.fullmoveNumber}
        <div class="board-controls" style="height: {boardSize}px;">
            <Board
                chessGame={currentGame}
                {playerColor}
                {boardSize}
                on:manualMoveMade={handleManualMoveEvent}
            />
            <GameHistory
                {gameManager}
                on:historySelected={handleHistorySelected}
            />
        </div>
    </div>
{/key}

<style>
    .board-controls {
        display: flex;
        flex-direction: row;
        gap: 32px;
    }
</style>
