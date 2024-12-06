<script lang="ts">
  import {PlayerColor, type GameConfig, type AlgorithmOption} from "./lib/chess/types";
  import { GameManager } from "./lib/chess/GameManager";
  import Game from "./lib/chess/Game.svelte";
  import { RandomMoveDelux } from "./lib/chess/AI/randomMoveDelux";
  import { FirstMoveDelux } from "./lib/chess/AI/firstMoveDelux";
  import { DrawScorer } from "./lib/chess/score/drawScorer";
  import { BestAiV1 } from "./lib/chess/AI/bestAiV1";
  import { BestEvaluatorV1 } from "./lib/chess/score/bestScorerV1";


  let gameConfig: GameConfig = {
    gameMode: {
      type:"SinglePlayerVsAi",
      playerColor: PlayerColor.WHITE,
      algorithmOption: {
        motor:new BestAiV1(new BestEvaluatorV1()),
        depth:3
      },
      timeFormat: {
        white: {
          secondsIncrement: 0,
          secondsStartTime: 300,
        },
        black: {
          secondsIncrement: 0,
          secondsStartTime: 600,
        },
      },
    },
    //FEN:"7k/5n2/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 1"
    //FEN:"7k/QQ3n2/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    //FEN: "4krn1/P1Pp1ppP/2pP1n2/PpqP4/2P1P3/2B5/PPQ2PPP/R3KBNR w KQq b5 3 12",
    FEN: null,
  };



  let gameConfig2: GameConfig = {
    gameMode: {
      type:"AiVsAi",
      playerColor: PlayerColor.WHITE,
      algorithmOptions: {
        white:{
          motor:new RandomMoveDelux(new DrawScorer()),
          depth:4
        },
        black:{
          motor: new FirstMoveDelux(new DrawScorer()),
          depth:4
        }
      },
      timeFormat: {
        white: {
          secondsIncrement: 0,
          secondsStartTime: 300,
        },
        black: {
          secondsIncrement: 0,
          secondsStartTime: 600,
        },
      },
    },
    //FEN:"r3k2r/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    //FEN: "4krn1/P1Pp1ppP/2pP1n2/PpqP4/2P1P3/2B5/PPQ2PPP/R3KBNR w KQq b5 3 12",
    FEN: null,
  };

  let gameManager = new GameManager(gameConfig);
  // let gameManager1 = new GameManager(gameConfig2);

</script>

<main>
  <Game {gameManager} />
  <!--  <Game gameManager={gameManager1} /> -->

</main>

<style>
</style>
