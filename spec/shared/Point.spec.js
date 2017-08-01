import Point from '../../shared/Point';

describe('Point', function() {

    let samplePoint;

    beforeEach(() => {
        samplePoint = new Point(10, 10)
    });

    describe('when a point is created', () => {
        it('should be able to report its coordinates', () => {
            expect(samplePoint.x).toEqual(11);
        });
    });

    describe('this test should fail', () => {
        it('should fail', () => {
                expect(false).toBe(true);
            }
        )

    })

});