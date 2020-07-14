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

interface GameStateFields {
    // cells stored in row-major order
    cells: List<RecordOf<Cell>>
    numRows: number
    numColumns: number
    numMines: number
    minesAllocated: boolean
}

const makeGameState = Record<GameStateFields>({
    cells: List<RecordOf<Cell>>(),
    numRows: 0,
    numColumns: 0,
    numMines: 0,
    minesAllocated: false
});

type GameState = RecordOf<GameStateFields>;

const neighborOffsets: Coord[] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];


export class MinesweeperGame {
    private readonly state: GameState;

    constructor(numRows: number, numColumns: number);
    constructor(numRows: number, numColumns: number, cells: List<Cell>);
    constructor(numRows: number, numColumns: number, numMines: number);
    constructor(gameState: GameState);
    constructor(numRowsOrState: any, maybeNumColumns?: number, cellsOrNumMines?: any) {
        if (Record.isRecord(numRowsOrState)) {
            this.state = numRowsOrState as GameState
        } else {
            const numRows = numRowsOrState as number;
            const numColumns = maybeNumColumns as number;
            if (List.isList(cellsOrNumMines)) {
                const cells = cellsOrNumMines as List<Cell>;
                if (cells.size !== numRows * numColumns) {
                    throw Error('Length of cells must be numRows * numColumns')
                }
                this.state = makeGameState({
                    cells: cells.map(c => makeCellRecord(c)),
                    numRows,
                    numColumns,
                    numMines: cells.reduce((n, cell) => cell.hasMine ? n + 1 : n, 0),
                    minesAllocated: true
                })
            } else {
                const cells = List.of(..._.times(numRows * numColumns, () => makeCell()));
                const numMines = typeof cellsOrNumMines === 'number' ? cellsOrNumMines as number : 0;
                this.state = makeGameState({cells, numRows, numColumns, numMines})
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
        const info = this.state.cells.reduce((info, cell) => {
                const hasMarkedMine = isExposed(cell.state) ? cell.state.exploded : cell.state.marker === Marker.Mine;
                return {
                    numMarkedMines: info.numMarkedMines + (hasMarkedMine ? 1 : 0),
                    numExploded: info.numExploded + (isExposed(cell.state) && cell.state.exploded ? 1 : 0)
                }
            },
            {
                numMarkedMines: 0,
                numExploded: 0
            })

        return {...info, numMines: this.state.numMines}
    }

    toJSON(): GameStateFields {
        return this.state.toJSON()
    }

    neighbors(row: number, column: number): [Coord, CellState][] {
        return neighborOffsets.map(([dr, dc]) => [dr + row, dc + column] as Coord)
            .filter(([r, c]) => r >= 0 && r < this.numRows && c >= 0 && c < this.numColumns)
            .map(([r, c]) => [[r, c], this.cellState(r, c)])
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
            const noMineCoords = neighborOffsets
                .map(([dr, dc]) => [dr + row, dc + column] as Coord)
                .filter(([r, c]) => r >= 0 && r < this.numRows && c >= 0 && c < this.numColumns);
            noMineCoords.push([row, column]);
            const noMineIndexes = noMineCoords.map(([r, c]) => r * this.numColumns + c);
            const potentialMineLocations = _.difference(_.range(this.numRows * this.numColumns), noMineIndexes);
            const mineLocations = new Set(_.sampleSize(potentialMineLocations, this.state.numMines));

            const cells = this.state.cells.map((cell, i) => cell.set('hasMine', mineLocations.has(i)));
            const newGame = new MinesweeperGame(this.state.merge({cells, minesAllocated: true}));
            return newGame.clearCell(row, column)
        }

        const cellsToClear: Coord[] = [[row, column]];
        const newCells = this.state.cells.withMutations(cells => {
            while (cellsToClear.length > 0) {
                const [row, column] = cellsToClear.pop()!;
                const oldCell = this.cell(row, column);

                const neighborCoords = neighborOffsets
                    .map(([dr, dc]) => [dr + row, dc + column] as Coord)
                    .filter(([r, c]) => r >= 0 && r < this.numRows && c >= 0 && c < this.numColumns);
                // count neighbors with mines
                let numMines = 0;
                for (let [nrow, ncol] of neighborCoords) {
                    if (this.cell(nrow, ncol).hasMine) {
                        numMines++;
                    }
                }

                const newCell = oldCell.set('state', makeExposedCellState({
                    exploded: oldCell.hasMine,
                    numMinesNearby: numMines
                }));
                cells = cells.set(row * this.numColumns + column, newCell);

                if (newCell.state.kind === 'exposed' && !newCell.state.exploded && newCell.state.numMinesNearby === 0) {
                    for (let [r, c] of neighborCoords) {
                        const neighbor = cells.get(r * this.numColumns + c)!;
                        if (!isExposed(neighbor.state)) {
                            cellsToClear.push([r, c])
                        }
                    }
                }
            }
        });

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

    private validateCoords(row: number, column: number) {
        if (row < 0 || row >= this.numRows || column < 0 || column >= this.numColumns) {
            throw Error(`{row: ${row}, col: ${column}} out of bounds.  numRows: ${this.numRows}, numColumns: ${this.numColumns}`)
        }
    }

    private cell(row: number, column: number): RecordOf<Cell> {
        this.validateCoords(row, column);
        const cell = this.state.cells.get(row * this.numColumns + column);
        if (cell) {
            return cell
        }
        throw Error(`(${row}, ${column}) out of bounds`)
    }

    private setCell(row: number, column: number, newCell: RecordOf<Cell>): MinesweeperGame {
        const newCells = this.state.cells.set(row * this.numColumns + column, newCell);
        return new MinesweeperGame(this.state.set('cells', newCells))
    }
}
