<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ChessGame } from "./ChessGame";
    import type { GameManager } from "./GameManager";

    export let gameManager: GameManager;

    let historyIndex: number | null = null;

    const dispatch = createEventDispatcher();

    const updateGame = (): void => {
        dispatch("historySelected", getCurrentGame());
    };

    const getCurrentGame = (): ChessGame => {
        if (historyIndex == null) return gameManager.chessGame;
        return historyIndex < gameManager.history.length
            ? gameManager.history[historyIndex].game
            : gameManager.chessGame;
    };

    const updateHistoryIndex = (increment: number): void => {
        if (gameManager.result) {
            if (historyIndex == null)
                historyIndex = gameManager.history.length - 1;
            else if (increment === 1)
                historyIndex =
                    historyIndex < gameManager.history.length - 1
                        ? historyIndex + 1
                        : historyIndex;
            else if (increment === -1)
                historyIndex =
                    historyIndex > 0 ? historyIndex - 1 : historyIndex;

            updateGame();
        }
    };

    const keyPressed = (event: KeyboardEvent): void => {
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                updateHistoryIndex(1);
                break;
            case "ArrowLeft":
            case "ArrowUp":
                updateHistoryIndex(-1);
                break;
        }
    };
</script>

<svelte:window on:keydown|stopPropagation={keyPressed} />
<div class="box">
    <div>
        <ol>
            {#each gameManager.history as entry, i}
                <li class="history-entry" class:currentHistory={i === historyIndex}>
                    
                    {#if !entry.move}
                        {"Start position"}
                    {:else}
                    <div class={entry.move.from.piece.type + " history-logo " + entry.move.from.piece.color.toLowerCase()}></div>
                        {entry.move.from.notation +
                            " -> " +
                            entry.move.to.notation}
                    {/if}
                </li>
            {/each}
        </ol>
    </div>
</div>

<style>

ol{
    padding: 5px 0;
    margin: 0;
}

    .currentHistory {
        background-color: black;
    }

    .box {
        min-width: 300px;
        overflow: auto;
        background-color: rgb(39, 39, 38);
        border-bottom: 10px solid rgb(39, 39, 38);
    }

    .history-logo{
        height: 32px;
        width: 32px;
    }

    .history-entry{
        display: flex;
        flex-direction: row;
        gap:16px;
        padding: 5px 20px;
    }
</style>
