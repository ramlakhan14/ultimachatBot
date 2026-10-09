import { ColorModeScript } from '@chakra-ui/react';
import * as React from 'react';
import ReactDOM from 'react-dom';
import { Base } from './Base';
import reportWebVitals from './reportWebVitals';
import theme from './theme/theme';
import * as serviceWorker from './serviceWorker';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import process from "process";

window.process = process;

const ignoreWarnings = [
	"validateDOMNesting",
	"React Hook",
	"no-unused-vars",
	"Invalid DOM property",
	"clip-path",
	"Permission not granted",
	"Notifications permission has been blocked",
	"Each child in a list should have a unique",
	"Expected length, \"auto\"",
	"react-paginate",
	"pagecount",
	"forcepage",
	"not an integer",
	"maximum page index",
	"can't perform a react state update on an unmounted component",
	"input elements should have autocomplete",
];

// if (process.env.NODE_ENV === "development") {
const originalWarn = console.warn;
const originalError = console.error;

const shouldIgnore = (args: any[]) => {
	const message = args.map(arg => String(arg)).join(" ");
	return ignoreWarnings.some(warn => message.includes(warn));
};

console.warn = (...args: any[]) => {
	if (shouldIgnore(args)) return;
	originalWarn(...args);
};

console.error = (...args: any[]) => {
	if (shouldIgnore(args)) return;
	originalError(...args);
};
// }

ReactDOM.render(
	<React.StrictMode>
		<Provider store={store}>
			<ColorModeScript initialColorMode={theme.config.initialColorMode} />
			<Base />
		</Provider>
	</React.StrictMode>,
	document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
// serviceWorker.registerService();
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
