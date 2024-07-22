<script lang="ts">
    import type { MouseEventHandler } from "svelte/elements";
    import type { ChessGame } from "./ChessGame";
    import NotationOverlay from "./NotationOverlay.svelte";
    import PromotionOverlay from "./PromotionOverlay.svelte";
    import {
        PlayerColor,
        type Move,
        type Square,
        type NonNullableFields,
        type Coordinate,
        PieceType,
    } from "./types";
    import {
        CHESS_BOARD_MAX_INDEX,
        CHESS_BOARD_MIN_INDEX,
        CHESS_BOARD_SIZE,
    } from "./gameUtils";
    import { createEventDispatcher } from "svelte";

    export let boardSize: number;
    export let chessGame: ChessGame;
    export let playerColor: PlayerColor;

    let draggingPiece: string | null;
    let transX: number;
    let transY: number;
    let selectPromotion: Move | null = null;

    const dispatch = createEventDispatcher();

    const moveStart: MouseEventHandler<HTMLDivElement> = (
        event: MouseEvent,
    ) => {
        let target: HTMLDivElement = event.target as HTMLDivElement;
        handleTranslatePiece(target, event);
    };

    const handleTranslatePiece = (
        target: HTMLDivElement,
        event: MouseEvent,
    ): void => {
        const boardRect = target.parentElement?.getBoundingClientRect();
        if (!boardRect) return;
        draggingPiece = target.id;
        const squareWidth = boardRect.width / CHESS_BOARD_SIZE;
        const squareHeight = boardRect.height / CHESS_BOARD_SIZE;
        const mouseX = event.clientX - (boardRect.left + squareWidth / 2);
        const mouseY = event.clientY - (boardRect.top + squareHeight / 2);
        transX = Math.floor((mouseX * 100) / squareWidth);
        transY = Math.floor((mouseY * 100) / squareHeight);
    };

    function mouseMove(event: MouseEvent) {
        if (draggingPiece) {
            let target: HTMLDivElement = event.target as HTMLDivElement;
            handleTranslatePiece(target, event);
        }
    }

    const moveStop = () => {
        if (draggingPiece) {
            const _fromSquare: Square = chessGame.findSquare(
                (s) => s.notation === draggingPiece,
            );
            if (!_fromSquare.piece) {
                draggingPiece = null;
                return;
            }
            const fromSquare = _fromSquare as NonNullableFields<Square>;
            const toSquareCooridnates: Coordinate =
                convertTranslatePercentageToCoordinate(
                    transX,
                    transY,
                    playerColor,
                );
            const toSquare =
                chessGame.board[toSquareCooridnates.y][toSquareCooridnates.x];
            if (promotionRequired(fromSquare, toSquare)) {
                handlePromotionRequired(fromSquare, toSquare);
                return;
            }

            handleMove({ from: fromSquare, to: toSquare });
        }
        draggingPiece = null;
    };

    const handlePromotionSelected = (event: CustomEvent<Move>): void => {
        selectPromotion = null;
        handleMove(event.detail);
    };

    const handleMove = (move: Move) => {
        dispatch("manualMoveMade", {
            ...move,
        });
    };

    const handlePromotionRequired = (
        fromSquare: NonNullableFields<Square>,
        toSquare: Square,
    ) => {
        selectPromotion = { from: fromSquare, to: toSquare };
    };

    const promotionRequired = (
        fromSquare: NonNullableFields<Square>,
        toSquare: Square,
    ): boolean => {
        const legalPawnMove = chessGame
            .getLegalMoves()
            .some(
                (_move) =>
                    _move.from.notation === fromSquare.notation &&
                    _move.to.notation === toSquare.notation,
            );
        if (!legalPawnMove) return false;
        if (!(fromSquare.piece.type === PieceType.PAWN)) return false;
        return (
            (fromSquare.piece.color === PlayerColor.WHITE &&
                toSquare.y === CHESS_BOARD_MAX_INDEX) ||
            (fromSquare.piece.color === PlayerColor.BLACK &&
                toSquare.y === CHESS_BOARD_MIN_INDEX)
        );
    };

    const convertTranslatePercentageToCoordinate = (
        translateX: number,
        translateY: number,
        playerColor: PlayerColor,
    ): Coordinate => {
        if (playerColor === PlayerColor.BLACK) {
            translateX = Math.abs(700 - translateX);
        } else {
            translateY = Math.abs(700 - translateY);
        }
        const x = Math.max(
            CHESS_BOARD_MIN_INDEX,
            Math.min(CHESS_BOARD_MAX_INDEX, Math.round(translateX / 100)),
        );
        const y = Math.max(
            CHESS_BOARD_MIN_INDEX,
            Math.min(CHESS_BOARD_MAX_INDEX, Math.round(translateY / 100)),
        );
        return { x, y };
    };
</script>

<svelte:window on:mouseup={moveStop} on:mousemove={mouseMove} />
<div class="chess-board-layout">
    <div
        id="board-background"
        class="board"
        style="width: {boardSize}px; height: {boardSize}px"
    >
        <NotationOverlay board={chessGame.board} {playerColor} />
        {#if selectPromotion}
            <PromotionOverlay
                move={selectPromotion}
                on:promotionSelected={handlePromotionSelected}
            />
        {/if}
        {#each chessGame.board as row}
            {#each row as square}
                <div
                    id={square.notation}
                    class:hide-piece={selectPromotion?.from.notation ===
                        square.notation}
                    class:attacked={chessGame.attacks.white.some(
                        (a) => a.attackTarget.notation === square.notation,
                    )}
                    class:reverse={playerColor === PlayerColor.BLACK}
                    class:piece={square.piece != null}
                    class={"square " +
                        square.notation +
                        " " +
                        (square.piece?.type ?? "")}
                    class:white={square.piece?.color === PlayerColor.WHITE}
                    class:black={square.piece?.color === PlayerColor.BLACK}
                    class:dragging={draggingPiece === square.notation}
                    on:mousedown={moveStart}
                    role="presentation"
                    style={draggingPiece === square.notation
                        ? `transform: translate(${transX}%,${transY}%);`
                        : ""}
                ></div>
            {/each}
        {/each}
    </div>
</div>

<style>
    div.square.hide-piece {
        background-image: none;
    }
    .square {
        padding: 0;
        width: 12.5%;
        height: 12.5%;
        position: absolute;
        touch-action: none;
    }
    .piece.dragging {
        z-index: 10;
    }

    .piece {
        cursor: grab;
        z-index: 1;
        padding: 0;
        width: 12.5%;
        height: 12.5%;
        position: absolute;
        touch-action: none;
        overflow: hidden;
    }

    .chess-board-layout {
        padding-bottom: 0px;
        position: relative;
    }

    #board-background {
        background-image: url("images/board_background.png");
    }

    div.board {
        background-size: 100%;
        display: block;
        height: 0;
        width: 100%;

        background-repeat: no-repeat;
        border-radius: 3px;
        overflow: initial;
        position: relative;
        user-select: none;
    }
</style>
