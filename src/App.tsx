import React from 'react';
import './App.css';
import * as msg from './minesweeper-game';
import {MinesweeperBoard} from './MinesweeperBoard'

enum CommandType {
    Clear,
    ClearNeighbors,
    MarkMine,
    MarkMaybe
}

function clearNeighbors(game: msg.MinesweeperGame, row: number, column: number): msg.MinesweeperGame {
    const cell = game.cellState(row, column);
    if (cell.kind !== 'exposed') {
        return game
    }

    // count marked neighbors
    const neighbors = game.neighbors(row, column);
    const numMarked = neighbors.reduce((n, [_, celln]) => {
        if (celln.kind === 'covered' && celln.marker === msg.Marker.Mine) {
            return n + 1
        }
        return n
    }, 0);

    // only clear if correct number of neighbors are marked
    if (numMarked !== cell.numMinesNearby) {
        return game
    }

    return neighbors.reduce((game_, [[r, c], cell_]) => {
        if (cell_.kind === 'covered' && cell_.marker !== msg.Marker.Mine) {
            return game_.clearCell(r, c)
        }
        return game_
    }, game)
}

interface AppProps {
    name: string
}

interface AppState {
    numRows: number,
    numColumns: number,
    numMines: number,
    game: msg.MinesweeperGame
    history: msg.MinesweeperGame[]
}

class App extends React.Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props);

        const
            numRows = 16,
            numColumns = 30,
            numMines = 100;
        const game = new msg.MinesweeperGame(numRows, numColumns, numMines);

        this.state = {numRows, numColumns, numMines, game, history: []};
        this.handleCellClick = this.handleCellClick.bind(this)
    }

    handleCellClick(row: number, column: number, event: any) {
        // event object will get modified after handler returns, so don't try to access it in the setState handler,
        // since that might execute after this method returns.
        let command = CommandType.Clear;
        if (event.shiftKey && event.altKey) {
            command = CommandType.MarkMaybe
        } else if (event.shiftKey) {
            command = CommandType.MarkMine
        } else if (event.altKey) {
            command = CommandType.ClearNeighbors
        }

        this.setState(state => {
            const game = state.game;
            if (game.gameInfo.numExploded > 0) {
                return
            }
            const cell = game.cellState(row, column);
            let newGame = game;

            switch (command) {
                case CommandType.Clear:
                    newGame = game.clearCell(row, column);
                    break;
                case CommandType.MarkMine:
                case CommandType.MarkMaybe: {
                    if (cell.kind === 'covered') {
                        const marker = command === CommandType.MarkMaybe ? msg.Marker.Maybe : msg.Marker.Mine;
                        newGame = game.markCell(row, column, cell.marker === marker ? undefined : marker);
                    }
                    break
                }
                case CommandType.ClearNeighbors: {
                    newGame = clearNeighbors(game, row, column);
                    break
                }
                default:
                    throw Error(`Unexpected command: ${command}`)
            }

            return {...state, game: newGame, history: [...state.history, game]}
        })
    }

    newGame() {
        this.setState(state => ({
            ...state,
            game: new msg.MinesweeperGame(state.numRows, state.numColumns, state.numMines),
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

    linkStateHandler(field: string, converter: (value: string) => any = String) {
        return (event: any) => {
            const value = converter(event.target.value);
            return this.setState(state => {
                return this.setState({...state, [field]: value})
            })
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
                    <li>Alt-click or Option-click to clear neighbors of cleared cell</li>
                    <li>Alt-Shift-click or Option-Shift-click to mark a cell with ?</li>
                </ul>
                <div className="game-config">
                    <label htmlFor="num-rows">Number of rows: </label>
                    <input type="number"
                           className="number-input"
                           value={this.state.numRows}
                           onChange={this.linkStateHandler('numRows', Number)}
                           id="num-rows"/>

                    <label htmlFor="num-columns">Number of columns: </label>
                    <input type="number"
                           className="number-input"
                           value={this.state.numColumns}
                           onChange={this.linkStateHandler('numColumns', Number)}
                           id="num-columns"/>

                    <label htmlFor="num-mines">Number of mines: </label>
                    <input type="number"
                           className="number-input"
                           value={this.state.numMines}
                           onChange={this.linkStateHandler('numMines', Number)}
                           id="num-mines"/>
                </div>
                Mines left: {info.numMines - info.numMarkedMines}
                <button onClick={() => this.newGame()} style={{marginLeft: '10px'}}>New Game</button>
                <button onClick={() => this.undoMove()} style={{marginLeft: '10px'}}>Undo</button>
                <MinesweeperBoard game={this.state.game} handleCellClick={this.handleCellClick}/>
            </div>
        );
    }
}

export default App;
