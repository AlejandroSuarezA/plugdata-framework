
export class TypeChecker {

	public static isString(arg: any): arg is String {
		return arg && (arg instanceof String || typeof arg === 'string');
	}

	public static isNumber(arg: any): arg is Number {
		return arg && (arg instanceof Number || typeof arg === 'number');
	}

	public static isBoolean(arg: any): arg is Boolean {
		return arg && (arg instanceof Boolean || typeof arg === 'boolean');
	}

	public static isObject(arg: any): arg is Object {
		return arg && (arg instanceof Object || typeof arg === 'object');
	}

	public static isArray<T>(arg: any): arg is T[] {
		return arg && Array.isArray(arg);
	}

	public static typeIsString(arg: Function): boolean {
		return arg && arg === String;
	}

	public static typeIsNumber(arg: Function): boolean {
		return arg && arg === Number;
	}

	public static typeIsBoolean(arg: Function): boolean {
		return arg && arg === Boolean;
	}

}
