import { FsUtils } from '../io/fs.utils';
import { ConsoleColors } from '../logs/log.enums';
import { Asserter } from './test.asserter';
import {
	ITestClass, ITestClassArgs, ITestMethod, ITestMethodArgs, ITestStats,
	TestTypeDetector, TTestClassItFunc, TTestMethodItFunc
} from './test.shared';

export class TestManager {

	// Contains all the registered test classes anotated with @TestClass
	private static testClasses: ITestClass[] = [];

	// Contains a temporal version for the methods until the antation from class executes
	private static tmpMethods: { [key: string /* Class name */]: ITestMethod[] } = {};
	private static tmpBeforeMethods: { [key: string /* Class name */]: ITestMethod[] } = {};
	private static tmpAfterMethods: { [key: string /* Class name */]: ITestMethod[] } = {};

	// Keeps a register of the result of all the executed tests
	private static executionStats: ITestStats[] = [];
	private static initialExecutionTime = 0;

	//
	// Public CLI methods
	//

	public static async executeTests(testFolder: string) {

		// 1: Force an execution on all decorators from the test folder
		this.initialExecutionTime = Date.now();
		await this.loadTests(testFolder);
		// 2: Print test classes and methods
		await this.printTestsStart();
		this.printTestsExec();

		// 2: Check if there are some tests we are focusing on in this executions
		const testOnlyClasses = this.testClasses
			.filter(tc => tc.testThisOnly || tc.testMethods.findIndex(m => m.testThisOnly === true) >= 0)
			.map(tc => tc.name);

		// 3: Execute all tests at the same time
		await Promise.all(
			this.testClasses.map(tc => this.executeTestClass(tc, testOnlyClasses))
		);

		// 4: Print stats
		this.printTestsEnd();

	}

	public static async showTestsInfo(testFolder: string) {

		// 1: Force an execution on all decorators from the test folder
		await this.loadTests(testFolder);

		// 2: Iterate secuentally over all classes and methods
		await this.printTestsStart();
	}

	//
	// Public Decorator methods
	//

	public static registerTestClass(clazz: Function, decoratorArgs: ITestClassArgs) {
		this.testClasses.push({
			clazz,
			name: clazz.name,
			testMethods: this.tmpMethods[clazz.name] || [],
			beforeTestMethods: this.tmpBeforeMethods[clazz.name],
			afterTestMethods: this.tmpAfterMethods[clazz.name],
			testThisOnly: decoratorArgs.testThisOnly
		});
	}

	public static registerTestMethod(testClass: string, methodName: string, methodFunc: Function, decoratorArgs: ITestMethodArgs) {
		this.tmpMethods[testClass] = (this.tmpMethods[testClass] || []).concat(<ITestMethod>{
			methodName,
			methodFunc,
			testThisOnly: decoratorArgs.testThisOnly
		});
	}

	public static registerBeforeTestMethod(testClass: string, methodName: string, methodFunc: Function) {
		this.tmpBeforeMethods[testClass] = (this.tmpBeforeMethods[testClass] || []).concat(<ITestMethod>{
			methodName, methodFunc
		});
	}

	public static registerAfterTestMethod(testClass: string, methodName: string, methodFunc: Function) {
		this.tmpAfterMethods[testClass] = (this.tmpAfterMethods[testClass] || []).concat(<ITestMethod>{
			methodName, methodFunc
		});
	}

	//
	// Public Assert error methods
	//

	public static assertErrorOnTest(testClass: string, testMethod: string) {

		const testClassStat = this.getTestClassStat(testClass);
		const testClassMethod = this.getTestMethodStat(testClassStat, testMethod);
		testClassMethod.errorAsserts++;

	}

	public static assertSuccessOnTest(testClass: string, testMethod: string) {

		const testClassStat = this.getTestClassStat(testClass);
		const testClassMethod = this.getTestMethodStat(testClassStat, testMethod);
		testClassMethod.successAsserts++;

	}

	public static unexpectedAssertErrorOnTestMethod(testClass: string, testMethod: string) {

		const testClassStat = this.getTestClassStat(testClass);
		const testClassMethod = this.getTestMethodStat(testClassStat, testMethod);
		testClassMethod.unexpectedError = true;

	}

	public static unexpectedAssertErrorOnTestClass(testClass: string) {

		const testClassStat = this.getTestClassStat(testClass);
		testClassStat.unexpectedError = true;

	}

	public static finishedTestMethod(testClass: string, testMethod: string) {

		const testClassStat = this.getTestClassStat(testClass);
		const testClassMethod = this.getTestMethodStat(testClassStat, testMethod);
		testClassMethod.success = testClassMethod.errorAsserts === 0 && !testClassStat.unexpectedError;

	}

	public static finishedTestClass(testClass: string) {

		const testClassStat = this.getTestClassStat(testClass);
		const testMethodsWithErrors = testClassStat.methods.filter(tm => tm.errorAsserts > 0);
		testClassStat.success = testMethodsWithErrors.length === 0 && !testClassStat.unexpectedError;

		console.log((testClassStat.success ? ConsoleColors.fgGreen : ConsoleColors.fgRed) +
			`* ${testClass} * ` + (testClassStat.success ? '(ok)' : '(Error)'), ConsoleColors.reset);

	}

	//
	// Private methods
	//

	private static async loadTests(testFolder: string) {
		return FsUtils.loadJsFolder(testFolder, true);
	}

	private static async iterateOverTests(classFunc: TTestClassItFunc, methodFunc: TTestMethodItFunc) {
		for (const testClass of this.testClasses) {
			await classFunc(testClass);
			for (const testMethod of testClass.testMethods) {
				await methodFunc(testMethod, testClass);
			}
		}
	}

	//
	// Private print methods
	//

	private static async logTestClass(clazz: ITestClass) {
		console.log(`${ConsoleColors.fgYellow}${clazz.name}${clazz.testThisOnly ? ' (Focused test)' : ''}`, ConsoleColors.reset);
	}

	private static async logTestMethod(method: ITestMethod) {
		console.log(`${ConsoleColors.fgCyan}- ${method.methodName}${method.testThisOnly ? ' (Focused test)' : ''}`, ConsoleColors.reset);
	}

	private static async printTestsStart() {

		console.log('-------------------------------------------------');
		console.log('-- Registered tests');
		console.log('-------------------------------------------------\n');

		await this.iterateOverTests(this.logTestClass, this.logTestMethod);

		console.log('');

	}

	private static printTestsExec() {

		console.log('-------------------------------------------------');
		console.log('-- Tests execution');
		console.log('-------------------------------------------------\n');

	}

	private static printTestsEnd() {

		console.log('\n-------------------------------------------------');
		console.log('-- Tests results');
		console.log('-------------------------------------------------\n');

		// Stats for executed classes
		let successTests = 0;
		let errorTests = 0;
		for (const classStat of this.executionStats) {

			// Class stat log
			const numOfTests = classStat.methods.length;
			const numOfTestsWithErrors = classStat.methods.filter(m => !m.success).length;
			const classPrefix = (numOfTestsWithErrors === 0) ? ConsoleColors.fgGreen :
				numOfTestsWithErrors < numOfTests ? ConsoleColors.fgYellow :
				ConsoleColors.fgRed;
			const successMethods = numOfTests - numOfTestsWithErrors;
			console.log(
				`${classPrefix}${classStat.className}: ` +
				`( ${successMethods} sucessful tests ) and ( ${numOfTestsWithErrors} test with errors )`,
				ConsoleColors.reset
			);

			successTests = successTests + successMethods;
			errorTests = errorTests + numOfTestsWithErrors;

			for (const methodStat of classStat.methods) {
				// Method stat log
				const methodPrefix = (methodStat.errorAsserts === 0) ? ConsoleColors.fgGreen :
					(methodStat.errorAsserts > 0 && methodStat.successAsserts > 0) ? ConsoleColors.fgYellow :
					ConsoleColors.fgRed;
				console.log(
					`${methodPrefix}- ${methodStat.methodName}: ` +
					`( ${methodStat.successAsserts} sucessful assertions ) and ( ${methodStat.errorAsserts} assertions with errors )`,
					ConsoleColors.reset
				);
			}

		}

		// Final stats

		console.log('\n--- Final results ---');
		console.log(`Execution time: ${Date.now() - this.initialExecutionTime} ms`);
		console.log(
			`Tests with errors: ${errorTests === 0 ? ConsoleColors.fgGreen : ConsoleColors.fgRed}${errorTests}`,
			ConsoleColors.reset
		);
		console.log(
			`Sucessful tests: ${errorTests === 0 ? ConsoleColors.fgGreen : ConsoleColors.fgYellow}${successTests}`,
			ConsoleColors.reset
		);
		console.log(
			`Tests result: ${errorTests === 0 ? ConsoleColors.fgGreen : ConsoleColors.fgRed}` +
				(errorTests === 0 ? 'Success' : 'Error'),
			ConsoleColors.reset
		);
		console.log('---------------------');

	}

	//
	// Private test execution methods
	//

	private static async executeTestClass(testClass: ITestClass, testOnlyClasses: string[]) {

		// Test this class only if there is no focus in any other test o this class is being focused
		if (testOnlyClasses.length === 0 || testOnlyClasses.includes(testClass.name)) {

			const promises: Promise<boolean>[] = [];
			// TODO check how to remove this any
			const asserter = new Asserter(testClass);
			const testObj = new (<any>testClass.clazz)();
			testObj.assert = asserter;

			// Check if there is a before tests func
			if (testClass.beforeTestMethods) {
				try {
					await Promise.all(testClass.beforeTestMethods.map(btm => testObj[btm.methodName]()));
				} catch (error) {
					console.log(`${ConsoleColors.fgRed}Unexpected error while executing beforeTest functions`, ConsoleColors.reset);
					console.log(`${ConsoleColors.fgRed}${error.stack || (new Error()).stack}`, ConsoleColors.reset);
				}
			}

			// Test only focused methods or all of them if there is no focus
			const testOnlyMethods = testClass.testMethods.filter(m => m.testThisOnly);
			if (testOnlyMethods.length === 0) {
				promises.push(
					...testClass.testMethods.map(m => this.executeTestMethod(m, testObj, testClass))
				);
			} else {
				promises.push(
					...testOnlyMethods.map(m => this.executeTestMethod(m, testObj, testClass))
				);
			}

			// Wait for all methods to execute
			await Promise.all(promises);

			// Calc stadistics
			this.finishedTestClass(testClass.name);

			// Check if there is a after tests func
			if (testClass.afterTestMethods) {
				try {
					await Promise.all(testClass.afterTestMethods.map(btm => testObj[btm.methodName]()));
				} catch (error) {
					console.log(`${ConsoleColors.fgRed}Unexpected error while executing afterTest functions`, ConsoleColors.reset);
					console.log(`${ConsoleColors.fgRed}${error.stack || (new Error()).stack}`, ConsoleColors.reset);
				}
			}

		}

	}

	private static async executeTestMethod(method: ITestMethod, testObj: any, clazz: ITestClass): Promise<boolean> {
		try {
			await (<Function>testObj[method.methodName])();
			this.finishedTestMethod(clazz.name, method.methodName);
			return true;
		} catch (error) {
			if (!TestTypeDetector.isTestMethodErrorToIgnore(error)) {
				this.unexpectedAssertErrorOnTestMethod(clazz.name, method.methodName);
				console.log(`${ConsoleColors.fgMagenta}An error ocureed while executing the test: ${clazz.name} - ${method.methodName}`);
				console.log(`${ConsoleColors.fgRed}${error.stack || (new Error()).stack}`, ConsoleColors.reset);
			}
			return false;
		}
	}

	//
	// Private assert methods
	//

	private static getTestClassStat(testClass: string) {
		let testClassStats = this.executionStats.find(tc => tc.className === testClass);
		if (testClassStats) {
			return testClassStats;
		} else {
			testClassStats = {
				className: testClass,
				success: false,
				unexpectedError: false,
				methods: []
			};
			this.executionStats.push(testClassStats);
			return testClassStats;
		}
	}

	private static getTestMethodStat(testClassStat: ITestStats, testMethod: string) {
		let testMethodStats = testClassStat.methods.find(tm => tm.methodName === testMethod);
		if (testMethodStats) {
			return testMethodStats;
		} else {
			testMethodStats = {
				methodName: testMethod,
				success: false,
				unexpectedError: false,
				errorAsserts: 0,
				successAsserts: 0
			};
			testClassStat.methods.push(testMethodStats);
			return testMethodStats;
		}
	}

}
