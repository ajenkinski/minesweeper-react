/*
Minesweeper game state representation.  The MinesweeperGame class is immutable.  Methods which modify the state
return a new instance.

Essentially, the game state consists of an array of rows * columns cells.

Each cell has an attribute which specifies whether the cell contains a mine, but this attribute is not visible to a
player until the cell is exposed.

At any given time, a cell is either hidden or exposed.

Hidden cells can have the following markers applied to them:
* Mine: the cell is marked as containing a mine
* Maybe: the cell is marked as maybe containing a mine

Exposed cells can be in the following states:
* Clear: does not contain a mine
* Exploded: contains an exploded mine.
 */

import {List, Range, Record, RecordOf} from 'immutable'
import _ from 'lodash'

export enum Marker {
    Mine,
    Maybe
}

export interface CoveredCellState {
    kind: 'covered'
    marker?: Marker
}

export interface ExposedCellState {
    kind: 'exposed'
    exploded: boolean
    numMinesNearby: number
}

export interface GameInfo {
    numMines: number
    numMarkedMines: number
    numExploded: number
}

export type CellState = CoveredCellState | ExposedCellState

export interface Cell {
    hasMine: boolean
    state: CellState
}

const makeCoveredCellState = Record<CoveredCellState>({kind: 'covered', marker: undefined});
const makeExposedCellState = Record<ExposedCellState>({
    kind: 'exposed',
    exploded: false,
    numMinesNearby: 0
});
const makeCell = Record<Cell>({hasMine: false, state: makeCoveredCellState()});

/**
 * Ensures that a cell is composed of Records
 * @param cell
 */
function makeCellRecord(cell: Cell): RecordOf<Cell> {
    const state = isExposed(cell.state) ? makeExposedCellState(cell.state) : makeCoveredCellState(cell.state);
    return makeCell(cell).set('state', state)
}

export function isExposed(state: CellState): state is ExposedCellState {
    return state.kind === 'exposed'
}

export class MinesweeperGame {
    // cells stored in row-major order
    private readonly cells: List<RecordOf<Cell>>;

    constructor(numRows: number, numColumns: number);
    constructor(numRows: number, numColumns: number, cells: List<Cell>);
    constructor(numRows: number, numColumns: number, numMines: number);
    constructor(readonly numRows: number, readonly numColumns: number, cellsOrNumMines?: any) {
        if (List.isList(cellsOrNumMines)) {
            const cells = cellsOrNumMines as List<Cell>;
            if (cells.size !== numRows * numColumns) {
                throw Error('Length of cells must be numRows * numColumns')
            }
            this.cells = cells.map(c => makeCellRecord(c))
        } else {
            const numMines = typeof cellsOrNumMines === 'undefined' ? 0 : cellsOrNumMines as number;
            const mineLocations = new Set(_.sampleSize(_.range(numRows * numColumns), numMines));

            this.cells = Range(0, numRows * numColumns).map(i => makeCell({
                hasMine: mineLocations.has(i)
            })).toList()
        }
    }

    get numExposed(): number {
        return this.cells.reduce((n, cell) => isExposed(cell.state) ? n + 1 : n, 0)
    }

    get gameInfo(): GameInfo {
        return this.cells.reduce((info, cell) => {
                const hasMarkedMine = isExposed(cell.state) ? cell.state.exploded : cell.state.marker === Marker.Mine;
                return {
                    numMines: info.numMines + (cell.hasMine ? 1 : 0),
                    numMarkedMines: info.numMarkedMines + (hasMarkedMine ? 1 : 0),
                    numExploded: info.numExploded + (isExposed(cell.state) && cell.state.exploded ? 1 : 0)
                }
            },
            {
                numMines: 0,
                numMarkedMines: 0,
                numExploded: 0
            })
    }

    cellState(row: number, column: number): CellState {
        return this.cell(row, column).state
    }

    clearCell(row: number, column: number): MinesweeperGame {
        const oldCell = this.cell(row, column);
        if (isExposed(oldCell.state)) {
            return this
        }

        // prevent first cleared cell from being a mine
        if (oldCell.hasMine && this.numExposed === 0) {
            // exchange the mine with another cell
            const currentIdx = row * this.numColumns + column;
            for (let i = 0; i < this.cells.size; i++) {
                if (i !== currentIdx && !this.cells.get(i)!.hasMine) {
                    const newCells = this.cells
                        .setIn([currentIdx, 'hasMine'], false)
                        .setIn([i, 'hasMine'], true);
                    const newGame = new MinesweeperGame(this.numRows, this.numColumns, newCells);
                    return newGame.clearCell(row, column)
                }
            }
        }

        // count neighbors with mines
        let numMines = 0;
        for (let [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
            const nrow = row + dr, ncol = column + dc;
            if (nrow >= 0 && nrow < this.numRows && ncol >= 0 && ncol < this.numColumns && this.cell(nrow, ncol).hasMine) {
                numMines++;
            }
        }

        const newCell = oldCell.set('state', makeExposedCellState({
            exploded: oldCell.hasMine,
            numMinesNearby: numMines
        }));
        return this.setCell(row, column, newCell)
    }

    markCell(row: number, column: number, marker?: Marker): MinesweeperGame {
        const oldCell = this.cell(row, column);
        if (isExposed(oldCell.state)) {
            throw Error(`Can't mark exposed cell: {row: ${row}, col: ${column}}`)
        }

        const newCell = oldCell.setIn(['state', 'marker'], marker);
        return this.setCell(row, column, newCell)
    }

    private validateCoords(row: number, column: number) {
        if (row < 0 || row >= this.numRows || column < 0 || column >= this.numColumns) {
            throw Error(`{row: ${row}, col: ${column}} out of bounds.  numRows: ${this.numRows}, numColumns: ${this.numColumns}`)
        }
    }

    private cell(row: number, column: number): RecordOf<Cell> {
        this.validateCoords(row, column);
        const cell = this.cells.get(row * this.numColumns + column);
        if (cell) {
            return cell
        }
        throw Error(`(${row}, ${column}) out of bounds`)
    }

    private setCell(row: number, column: number, newCell: RecordOf<Cell>): MinesweeperGame {
        return new MinesweeperGame(
            this.numRows,
            this.numColumns,
            this.cells.set(row * this.numColumns + column, newCell))
    }
}
