<script lang="ts">
    import { PieceType, type Move, PlayerColor } from "./types";
    import { createEventDispatcher } from "svelte";

    export let move: Move;

    const dispatch = createEventDispatcher();

    function handleSelected(pieceType: PieceType) {
        dispatch("promotionSelected", 
            { ...move, promotion: pieceType },
        );
    }

    const promotionPieces: (
        | PieceType.BISHOP
        | PieceType.KNIGHT
        | PieceType.ROOK
        | PieceType.QUEEN
    )[] = [PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK, PieceType.QUEEN];
</script>

<div class={"promotionSelect " + move.to.notation} class:reverse={move.from.piece.color === PlayerColor.BLACK}>
    <div class="selections">
        {#each promotionPieces as promotionPiece}
            <button on:click={() => handleSelected(promotionPiece)}
                class={"selection " +
                    move.from.piece.color.toLowerCase() +
                    " " +
                    promotionPiece}
            ></button>
        {/each}
    </div>
</div>

<style>
    button:hover {
        background-color: aqua;
    }

    button {
        background-color: transparent;
        border: none;
        padding: 0;
        margin: 0;
        border-radius: 10px;
    }
    .selection {
        display: inline-block;
        width: 24%;
        height: 100%;
    }

    .selections {
        position: relative;
        width: 400%;
        height: 100px;
        transform: translate(-50%, 0);
        background-color: white;
        border-radius: 10px;
        box-shadow: inset;
        box-shadow: 10px 5px 20px black;
    }

    .promotionSelect {
        width: 12.5%;
        height: 0;
        left: 6.25%;
        z-index: 30;

        position: absolute;
    }
</style>
