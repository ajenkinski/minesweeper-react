import _ from 'lodash'
import * as msg from "./minesweeper-game";

function allCoords(numRows: number, numCols: number): number[][] {
    const array = _.times(numRows, row => _.times(numCols, col => [row, col]));
    return _.flatten(array)
}

describe('minesweeper', () => {
    const game = new msg.MinesweeperGame(5, 6);
    test('shape', () => {
        expect(game.numRows).toEqual(5)
        expect(game.numColumns).toEqual(6)
    });

    test.each(allCoords(game.numRows, game.numColumns))('Coord %i, %i empty', (row, column) => {
        const cell = game.cellState(row, column);
        expect(cell.kind).toEqual('covered')
        expect(msg.isExposed(cell)).toBeFalsy();
        expect((cell as msg.CoveredCellState).marker).toBeFalsy()
    });

    test('Set marker', () => {
        const game2 = game.markCell(1, 2, msg.Marker.Mine);
        const cell = game2.cellState(1, 2);
        expect(cell.kind).toEqual('covered');
        expect((cell as msg.CoveredCellState).marker).toEqual(msg.Marker.Mine)
    })

    test('Clear cell with no bomb', () => {
        const game2 = game.clearCell(3, 4);
        const cell = game2.cellState(3, 4);
        expect(cell.kind).toEqual('exposed');
        expect((cell as msg.ExposedCellState).exploded).toBeFalsy()
    });

    test('Clear cell with mine', () => {
        const cells: msg.Cell[] = [
            {hasMine: true, state: {kind: "covered"}},
            {hasMine: true, state: {kind: "covered"}},
            {hasMine: false, state: {kind: "covered"}},
            {hasMine: false, state: {kind: "covered"}}
        ];
        const game = new msg.MinesweeperGame(2, 2, cells);
        const game2 = game.clearCell(0, 0);
        const cell = game2.cellState(0, 0);

        expect(cell.kind).toEqual('exposed');
        expect((cell as msg.ExposedCellState).exploded).toBeTruthy()
    });

    test('Create game with numBombs', () => {
        const game = new msg.MinesweeperGame(5, 6, 10).clearCell(0, 0);
        const numBombs = game['state'].cells.reduce((n, cell) => cell.hasMine ? n + 1 : n, 0);
        expect(numBombs).toEqual(10)
    });

    test('First cleared cell does not contain bomb', () => {
        const game = new msg.MinesweeperGame(5, 6, 10);
        for (let row = 0; row < game.numRows; row++) {
            for (let col = 0; col < game.numColumns; col++) {
                const game2 = game.clearCell(row, col);
                let cellState = game2.cellState(row, col);
                expect(cellState.kind).toEqual('exposed')
                expect((cellState as msg.ExposedCellState).exploded).toBeFalsy()
            }
        }
    })
});
