import React from 'react';
import './App.css';
import * as msg from './minesweeper-game';
import {MinesweeperBoard} from './MinesweeperBoard'

export interface AppProps {
    name: string
}

class App extends React.Component<AppProps, {game: msg.MinesweeperGame}> {
    constructor(props: AppProps) {
        super(props)
        this.state = {
            game: new msg.MinesweeperGame(20, 30, 200)
        }
    }
    handleCellClick(row: number, column: number, event: any) {
        console.log(`row=${row}, column=${column}`)
        const game = this.state.game;
        const cell = game.cellState(row, column);
        if (event.shiftKey || event.altKey) {
            if (cell.kind === 'covered') {
                let marker: msg.Marker | undefined = event.shiftKey ? msg.Marker.Bomb : msg.Marker.Maybe;
                if (cell.marker === marker) {
                    marker = undefined
                }
                this.setState(state => ({...state, game: game.markCell(row, column, marker)}))
            }
        } else {
            this.setState(state => ({...state, game: game.clearCell(row, column)}))
        }
    }

    render() {
        return (
            <div className="App">
                <h1>{this.props.name}</h1>
                <ul>
                    <li>Click to clear a cell</li>
                    <li>Shift-click to mark a cell as a mine</li>
                    <li>Alt-click or Option-click to mark a cell with ?</li>
                </ul>
                <MinesweeperBoard game={this.state.game} handleCellClick={this.handleCellClick.bind(this)}/>
            </div>
        );
    }
}

export default App;
