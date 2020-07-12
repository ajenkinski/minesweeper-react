import React from 'react';
import * as msg from './minesweeper-game';


class Cell extends React.PureComponent<{ cell: msg.CellState }> {
    render() {
        const cell = this.props.cell;
        let char = ' ';
        if (msg.isExposed(cell)) {
            if (cell.exploded) {
                char = 'X'
            }
        } else {
            switch (cell.marker) {
                case msg.Marker.Bomb:
                    char = 'B';
                    break;
                case msg.Marker.Maybe:
                    char = '?';
                    break;
            }
        }

        return (
            <button className="cell">{char}</button>
        )
    }
}

export class MinesweeperBoard extends React.PureComponent<{ game: msg.MinesweeperGame }> {
    renderCell(row: number, column: number) {
        return (
            <Cell cell={this.props.game.cellState(row, column)}/>
        )
    }

    render() {
        const game = this.props.game;
        const rows = [];

        for (let rowNum = 0; rowNum < game.numRows; rowNum++) {
            const row = [];
            for (let colNum = 0; colNum < game.numColumns; colNum++) {
                row[colNum] = this.renderCell(rowNum, colNum)
            }
            rows[rowNum] = (<div className="board-row">{row}</div>)
        }

        return (
            <div className="board">
                {rows}
            </div>
        )
    }
}
