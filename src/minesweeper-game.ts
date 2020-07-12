/*
Minesweeper game state representation.  The MinesweeperGame class is immutable.  Methods which modify the state
return a new instance.

Essentially, the game state consists of an array of rows * columns cells.

Each cell has an attribute which specifies whether the cell contains a bomb, but this attribute is not visible to a
player until the cell is exposed.

At any given time, a cell is either hidden or exposed.

Hidden cells can have the following markers applied to them:
* Bomb: the cell is marked as containing a bomb
* Maybe: the cell is marked as maybe containing a bomb

Exposed cells can be in the following states:
* Clear: does not contain a bomb
* Exploded: contains an exploded bomb.
 */

import {List, Range, Record, RecordOf} from 'immutable'

export enum Marker {
    Bomb,
    Maybe
}

export interface CoveredCellState {
    kind: 'covered'
    marker?: Marker
}

export interface ExposedCellState {
    kind: 'exposed'
    exploded: boolean
}

export type CellState = CoveredCellState | ExposedCellState

interface Cell {
    hasBomb: boolean
    state: CellState
}

const makeCoveredCellState = Record<CoveredCellState>({kind: 'covered'});
const makeExposedCellState = Record<ExposedCellState>({kind: 'exposed', exploded: false});
const makeCell = Record<Cell>({hasBomb: false, state: makeCoveredCellState()});

export function isExposed(state: CellState): state is ExposedCellState {
    return state.kind === 'exposed'
}

export class MinesweeperGame {
    // cells stored in row-major order
    private readonly cells: List<Cell>;

    constructor(readonly numRows: number, readonly numColumns: number, cells?: List<Cell>) {
        if (cells) {
            if (cells.size !== numRows * numColumns) {
                throw Error('Length of cells must be numRows * numColumns')
            }
            this.cells = cells
        } else {
            this.cells = List<Cell>(Range(0, numRows * numColumns).map(() => makeCell()))
        }
    }

    cellState(row: number, column: number): CellState {
        return this.cell(row, column).state
    }

    clearCell(row: number, column: number): MinesweeperGame {
        const oldCell = this.cell(row, column) as RecordOf<Cell>;
        if (isExposed(oldCell.state)) {
            return this
        }
        const newCell = oldCell.set('state', makeExposedCellState({exploded: oldCell.hasBomb}));
        return this.setCell(row, column, newCell)
    }

    markCell(row: number, column: number, marker?: Marker): MinesweeperGame {
        const oldCell = this.cell(row, column) as RecordOf<Cell>;
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

    private cell(row: number, column: number): Cell {
        this.validateCoords(row, column);
        const cell = this.cells.get(row * this.numColumns + column);
        if (cell) {
            return cell
        }
        throw Error(`(${row}, ${column}) out of bounds`)
    }

    private setCell(row: number, column: number, newCell: Cell): MinesweeperGame {
        return new MinesweeperGame(
            this.numRows,
            this.numColumns,
            this.cells.set(row * this.numColumns + column, newCell))
    }
}
