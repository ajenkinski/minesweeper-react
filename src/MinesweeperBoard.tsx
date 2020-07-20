import React from 'react';
import * as msg from './game/minesweeper-game';
import './MinesweeperBoard.css';
import mine_icon from './mine.svg';
import flag_icon from './flag.svg';

interface CellProps {
    cell: msg.CellState
    row: number
    column: number
    handleCellClick(row: number, column: number, event: React.MouseEvent): void
}

class Cell extends React.PureComponent<CellProps> {
    onClick(event: React.MouseEvent) {
        if (event.ctrlKey) {
            // In this case, onRightClick will have already handled the event.  In Safari though, both handlers get
            // called
            return
        }
        this.props.handleCellClick(this.props.row, this.props.column, event)
    }

    onRightClick(event: React.MouseEvent) {
        // prevent context menu from appearing
        event.preventDefault();
        this.props.handleCellClick(this.props.row, this.props.column, event)
    }

    render() {
        const cell = this.props.cell;
        let content: any = ' ';
        const cssClasses = ['cell'];

        if (msg.isExposed(cell)) {
            if (cell.exploded) {
                cssClasses.push('cell-exploded');
                content = <img src={mine_icon} alt={'mine'}/>;
            } else {
                cssClasses.push('cell-exposed');
                const num = cell.numMinesNearby;
                if (num !== 0) {
                    content = `${num}`
                }
            }
        } else {
            switch (cell.marker) {
                case msg.Marker.Mine:
                    content = <img src={flag_icon} alt={'flag'}/>;
                    break;
                case msg.Marker.Maybe:
                    content = '?';
                    break;
            }
        }

        return (
            <button className={cssClasses.join(' ')}
                    onClick={event => this.onClick(event)}
                    onContextMenu={event => this.onRightClick(event)}
            >
                {content}
            </button>
        )
    }
}

interface MinesweeperBoardProps {
    game: msg.MinesweeperGame
    handleCellClick(row: number, column: number, event: React.MouseEvent): void
}

export class MinesweeperBoard extends React.PureComponent<MinesweeperBoardProps> {
    renderCell(row: number, column: number) {
        return (
            <Cell key={`${row}_${column}`}
                  cell={this.props.game.cellState(row, column)}
                  row={row}
                  column={column}
                  handleCellClick={this.props.handleCellClick}
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
