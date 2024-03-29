import { Test, TestClass } from '../../src/test/test.decorators';
import { PlugTest } from '../../src/test/test.shared';
import { LogUtils } from '../../src/utils/log.utils';

@TestClass()
export class LogUtilsTest extends PlugTest {

	@Test()
	public selfAndTotalTimeFromStart() {
		const ex1 = LogUtils.selfAndTotalTimeFromStart(Date.now(), Date.now());
		const ex2 = LogUtils.selfAndTotalTimeFromStart(Date.now() - 1000, Date.now() - 100);
		this.assert.ok(
			ex1 === 'Self time from start: 0 ms,\tTotal time from start: 0 ms' ||
			ex1 === 'Self time from start: 0 ms,\tTotal time from start: 1 ms' ||
			ex1 === 'Self time from start: 1 ms,\tTotal time from start: 0 ms' ||
			ex1 === 'Self time from start: 1 ms,\tTotal time from start: 1 ms'
		);
		this.assert.ok(
			ex2 === 'Self time from start: 1.000 ms,\tTotal time from start: 100 ms' ||
			ex2 === 'Self time from start: 1.000 ms,\tTotal time from start: 101 ms' ||
			ex2 === 'Self time from start: 1.001 ms,\tTotal time from start: 100 ms' ||
			ex2 === 'Self time from start: 1.001 ms,\tTotal time from start: 101 ms'
		);
	}

}
