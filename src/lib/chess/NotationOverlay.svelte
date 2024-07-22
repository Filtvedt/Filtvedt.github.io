<script lang="ts">
    import { PlayerColor, type Board } from "./types";

    export let board: Board;
    export let playerColor: PlayerColor;

    
    let blackGrid = [
        "h8",
        "h7",
        "h6",
        "h5",
        "h4",
        "h3",
        "h2",
        "h1",
        "g8",
        "f8",
        "e8",
        "d8",
        "c8",
        "b8",
        "a8",
    ];
    let whiteGrid = [
        "a8",
        "a7",
        "a6",
        "a5",
        "a4",
        "a3",
        "a2",
        "h1",
        "g1",
        "f1",
        "e1",
        "d1",
        "c1",
        "b1",
        "a1",
    ];
</script>

{#each board as row, rowIndex}
    {#each row as square, index}
        {#if (playerColor === PlayerColor.BLACK && blackGrid.includes(square.notation)) || (playerColor === PlayerColor.WHITE && whiteGrid.includes(square.notation))}
            <div
                class:reverse-color={(index + (rowIndex % 2)) % 2 === 0}
                class={"notation " + square.notation}
                class:reverse={playerColor === PlayerColor.BLACK}
            >
                {#if (playerColor === PlayerColor.WHITE && square.notation.includes("a")) || (playerColor === PlayerColor.BLACK && square.notation.includes("h"))}
                    <div class="top">
                        {square.notation.charAt(1)}
                    </div>
                {/if}
                {#if (playerColor === PlayerColor.WHITE && square.notation.includes("1")) || (playerColor === PlayerColor.BLACK && square.notation.includes("8"))}
                    <div class="bottom">
                        {square.notation.charAt(0)}
                    </div>
                {/if}
            </div>
        {/if}
    {/each}
{/each}

<style>
        .notation.reverse-color {
        color: var(--light-board-square);
    }

    .notation .top {
        position: absolute;
        left: 10%;
        top: 5%;
    }

    .notation .bottom {
        position: absolute;
        right: 7%;
        bottom: 8%;
    }

    .notation {
        z-index: 0;
        padding: 0;
        width: 12.5%;
        height: 12.5%;
        position: absolute;
        color: var(--dark-board-square);
        font-weight: 800;
        text-transform: uppercase;
    }
</style>
