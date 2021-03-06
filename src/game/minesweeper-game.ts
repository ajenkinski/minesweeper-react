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

import {List, Record, RecordOf} from 'immutable'
import _ from 'lodash'

type Coord = [number, number];

export enum GameStatus {
    Win,
    Lose,
    InProgress
}

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
    status: GameStatus
}

export type CellState = CoveredCellState | ExposedCellState

export interface Cell {
    hasMine: boolean
    state: CellState
}

const CoveredCellState = Record<CoveredCellState>({kind: 'covered', marker: undefined});
const ExposedCellState = Record<ExposedCellState>({
    kind: 'exposed',
    exploded: false,
    numMinesNearby: 0
});
const Cell = Record<Cell>({hasMine: false, state: CoveredCellState()});

/**
 * Ensures that a cell is composed of Records
 * @param cell
 */
function makeCellRecord(cell: Cell): RecordOf<Cell> {
    const state = isExposed(cell.state) ? ExposedCellState(cell.state) : CoveredCellState(cell.state);
    return Cell(cell).set('state', state)
}

export function isExposed(state: CellState): state is ExposedCellState {
    return state.kind === 'exposed'
}

interface GameStateFields {
    // cells stored in row-major order
    cells: List<RecordOf<Cell>>
    numRows: number
    numColumns: number
    numMines: number
    minesAllocated: boolean
}

const GameState = Record<GameStateFields>({
    cells: List<RecordOf<Cell>>(),
    numRows: 0,
    numColumns: 0,
    numMines: 0,
    minesAllocated: false
});

type GameState = RecordOf<GameStateFields>;

function isIterableCells(object: any): object is Iterable<Cell> {
    return typeof object?.[Symbol.iterator] === 'function'
}

export class MinesweeperGame {
    private readonly state: GameState;

    constructor(numRows: number, numColumns: number);
    constructor(numRows: number, numColumns: number, cells: Iterable<Cell>);
    constructor(numRows: number, numColumns: number, numMines: number);
    constructor(gameState: GameState);
    constructor(...args: any) {
        if (Record.isRecord(args[0])) {
            this.state = args[0] as GameState
        } else {
            const numRows = args[0] as number;
            const numColumns = args[1] as number;
            if (isIterableCells(args[2])) {
                const cells = List<Cell>(args[2]);
                if (cells.size !== numRows * numColumns) {
                    throw Error('Length of cells must be numRows * numColumns')
                }
                this.state = GameState({
                    cells: cells.map(c => makeCellRecord(c)),
                    numRows,
                    numColumns,
                    numMines: cells.reduce((n, cell) => cell.hasMine ? n + 1 : n, 0),
                    minesAllocated: true
                })
            } else {
                const numMines: number = args[2] ?? 0;
                const cells = List.of(..._.fill(Array(numRows * numColumns), Cell()));
                this.state = GameState({cells, numRows, numColumns, numMines})
            }
        }
    }

    get numRows() {
        return this.state.numRows
    }

    get numColumns() {
        return this.state.numColumns
    }

    get numExposed(): number {
        return this.state.cells.reduce((n, cell) => isExposed(cell.state) ? n + 1 : n, 0)
    }

    get gameInfo(): GameInfo {
        // categorize cells into exploded, cleared, mine, and covered, and count occurrences
        let stats = _.countBy(this.state.cells.toArray(), cell => {
            if (isExposed(cell.state)) {
                return cell.state.exploded ? 'exploded' : 'cleared'
            } else {
                return cell.state.marker === Marker.Mine ? 'mine' : 'covered'
            }
        });

        // apply defaults
        stats = {
            exploded: 0,
            cleared: 0,
            mine: 0,
            covered: 0,
            ...stats
        };

        let status: GameStatus;
        if (stats.exploded > 0) {
            status = GameStatus.Lose
        } else if (stats.mine === this.state.numMines && stats.covered === 0) {
            status = GameStatus.Win
        } else {
            status = GameStatus.InProgress
        }

        return {
            numMines: this.state.numMines,
            numExploded: stats.exploded,
            numMarkedMines: stats.mine,
            status: status
        }
    }

    toJSON(): GameStateFields {
        return this.state.toJSON()
    }

    neighborCoords(row: number, column: number): Coord[] {
        const neighborOffsets: Coord[] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        return neighborOffsets.map(([dr, dc]) => [dr + row, dc + column] as Coord)
            .filter(([r, c]) => r >= 0 && r < this.numRows && c >= 0 && c < this.numColumns)
    }

    neighbors(row: number, column: number): [Coord, CellState][] {
        return this.neighborCoords(row, column).map(([r, c]) => [[r, c], this.cellState(r, c)])
    }

    cellState(row: number, column: number): CellState {
        return this.cell(row, column).state
    }

    clearCell(row: number, column: number): MinesweeperGame {
        const oldCell = this.cell(row, column);
        if (isExposed(oldCell.state)) {
            return this
        }

        // Allocate mines if this is the first cell being cleared
        if (!this.state.minesAllocated) {
            // Make it so initial cleared cell is in an open area
            const noMineCoords = this.neighborCoords(row, column).concat([[row, column]]);
            const noMineIndexes = noMineCoords.map(([r, c]) => this.getIndex(r, c));
            const potentialMineLocations = _.difference(_.range(this.numRows * this.numColumns), noMineIndexes);
            const mineLocations = new Set(_.sampleSize(potentialMineLocations, this.state.numMines));

            const cells = this.state.cells.map((cell, i) => cell.set('hasMine', mineLocations.has(i)));
            const newGame = new MinesweeperGame(this.state.merge({cells, minesAllocated: true}));
            return newGame.clearCell(row, column)
        }

        const newCell = oldCell.set('state', this.getClearedCellState(row, column));
        return this.setCell(row, column, newCell);
    }

    clearNeighbors(row: number, column: number): MinesweeperGame {
        let cell = this.cell(row, column)
        if (!isExposed(cell.state) || cell.state.exploded) {
            return this
        }

        let numMarkedNeighbors = this.neighbors(row, column)
            .filter(([_, c]) => c.kind === 'covered' && c.marker === Marker.Mine).length;
        if (numMarkedNeighbors !== cell.state.numMinesNearby) {
            return this
        }

        const indexesToClear: Set<number> = new Set(this.neighbors(row, column)
            .filter(([_, c]) => c.kind === 'covered' && c.marker !== Marker.Mine)
            .map(([[r, c], _]) => this.getIndex(r, c)));

        const indexToCoord = (index: number): Coord => {
            return [Math.floor(index / this.numColumns), index % this.numColumns]
        }

        const newCells = this.state.cells.withMutations(cells => {
            while (indexesToClear.size > 0) {
                let index = indexesToClear.values().next().value
                indexesToClear.delete(index)

                const [row, column] = indexToCoord(index)
                const cellState = this.getClearedCellState(row, column)
                cells = cells.set(index, cells.get(index)!.set('state', cellState))

                if (cellState.kind === 'exposed' && !cellState.exploded && cellState.numMinesNearby === 0) {
                    for (const coord of this.neighborCoords(row, column)) {
                        const ncell = cells.get(this.getIndex(coord[0], coord[1]))!.state
                        if (ncell.kind === 'covered') {
                            indexesToClear.add(this.getIndex(coord[0], coord[1]))
                        }
                    }
                }
            }
        })

        return new MinesweeperGame(this.state.set('cells', newCells))
    }

    markCell(row: number, column: number, marker?: Marker): MinesweeperGame {
        const oldCell = this.cell(row, column);
        if (isExposed(oldCell.state)) {
            throw Error(`Can't mark exposed cell: {row: ${row}, col: ${column}}`)
        }

        const newCell = oldCell.setIn(['state', 'marker'], marker);
        return this.setCell(row, column, newCell)
    }

    private getIndex(row: number, column: number): number {
        return row * this.numColumns + column
    }

    private validateCoord(row: number, column: number) {
        if (row < 0 || row >= this.numRows || column < 0 || column >= this.numColumns) {
            throw Error(`{row: ${row}, col: ${column}} out of bounds.  numRows: ${this.numRows}, numColumns: ${this.numColumns}`)
        }
    }

    private getClearedCellState(row: number, column: number): CellState {
        let numMinesNearby = this.neighborCoords(row, column).filter(([r, c]) => this.cell(r, c).hasMine).length;
        return ExposedCellState({
            exploded: this.cell(row, column).hasMine,
            numMinesNearby
        })
    }

    private cell(row: number, column: number): RecordOf<Cell> {
        this.validateCoord(row, column);
        const cell = this.state.cells.get(this.getIndex(row, column));
        if (cell) {
            return cell
        }
        throw Error(`(${row}, ${column}) out of bounds`)
    }

    private setCell(row: number, column: number, newCell: RecordOf<Cell>): MinesweeperGame {
        const newCells = this.state.cells.set(this.getIndex(row, column), newCell);
        return new MinesweeperGame(this.state.set('cells', newCells))
    }
}
