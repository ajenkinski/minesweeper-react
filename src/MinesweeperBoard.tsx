import React from 'react';
import * as msg from './minesweeper-game';
import './MinesweeperBoard.css';

interface CellProps {
    cell: msg.CellState
    onClick(event: any): void
}

class Cell extends React.PureComponent<CellProps> {
    render() {
        const cell = this.props.cell;
        let char = ' ';
        const cssClasses = ['cell'];

        if (msg.isExposed(cell)) {
            cssClasses.push('cell-exposed')
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
            <button className={cssClasses.join(' ')} onClick={this.props.onClick}>{char}</button>
        )
    }
}

interface MinesweeperBoardProps {
    game: msg.MinesweeperGame
    handleCellClick(row: number, column: number, event: any): void
}

export class MinesweeperBoard extends React.PureComponent<MinesweeperBoardProps> {
    renderCell(row: number, column: number) {
        return (
            <Cell key={`${row}_${column}`}
                  cell={this.props.game.cellState(row, column)}
                  onClick={event => this.props.handleCellClick(row, column, event)}
            />
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
            rows[rowNum] = (<div key={rowNum} className="board-row">{row}</div>)
        }

        return (
            <div className="board">
                {rows}
            </div>
        )
    }
}
