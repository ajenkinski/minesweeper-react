import React from 'react';
import './App.css';
import * as msg from './minesweeper-game';
import {MinesweeperBoard} from './MinesweeperBoard'

interface AppProps {
    name: string
}

interface AppState {
    game: msg.MinesweeperGame
    history: msg.MinesweeperGame[]
}

class App extends React.Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props)
        this.state = {
            game: new msg.MinesweeperGame(20, 30, 200),
            history: []
        };
        this.handleCellClick = this.handleCellClick.bind(this)
    }

    handleCellClick(row: number, column: number, event: any) {
        // event object will get modified after handler returns, so don't try to access it in the setState handler,
        // since that might execute after this method returns.
        let marker: msg.Marker | undefined;
        if (event.shiftKey) {
            marker = msg.Marker.Mine
        } else if (event.altKey) {
            marker = msg.Marker.Maybe
        }

        this.setState(state => {
            const game = state.game;
            if (game.gameInfo.numExploded > 0) {
                return
            }
            const cell = game.cellState(row, column);
            let newGame = game;
            if (typeof marker !== 'undefined') {
                if (cell.kind === 'covered') {
                    newGame = game.markCell(row, column, cell.marker === marker ? undefined : marker)
                }
            } else {
                newGame = game.clearCell(row, column)
            }

            return {...state, game: newGame, history: [...state.history, game]}
        })
    }

    newGame() {
        this.setState(state => ({
            ...state,
            game: new msg.MinesweeperGame(20, 30, 150),
            history: []
        }))
    }

    undoMove() {
        if (this.state.history.length > 0) {
            this.setState(state => ({
                game: state.history[state.history.length - 1],
                history: state.history.slice(0, state.history.length - 1)
            }))
        }
    }

    render() {
        const info = this.state.game.gameInfo;
        return (
            <div className="App">
                <h1>{this.props.name}</h1>
                <ul>
                    <li>Click to clear a cell</li>
                    <li>Shift-click to mark a cell as a mine</li>
                    <li>Alt-click or Option-click to mark a cell with ?</li>
                </ul>
                Mines left: {info.numMines - info.numMarkedMines}
                <button onClick={() => this.newGame()} style={{marginLeft: '10px'}}>New Game</button>
                <button onClick={() => this.undoMove()} style={{marginLeft: '10px'}}>Undo</button>
                <MinesweeperBoard game={this.state.game} handleCellClick={this.handleCellClick}/>
            </div>
        );
    }
}

export default App;
