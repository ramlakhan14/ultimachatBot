import * as React from 'react';
import {
	ChakraProvider,
	Box,
	Grid,
} from '@chakra-ui/react';
import '@fontsource/inter/100.css';
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import theme from './theme/theme';
import {
	BrowserRouter as Router,
	Switch,
	Route,
} from 'react-router-dom';
import SignUp from './containers/SignUp/SignUp';
import axios from 'axios';
import { removeAuthenticationDetails, setAuthDetails } from './utils/authUtils';
import Login from './containers/Login/Login';
import { PrivateRoute } from './components/PrivateRoute/PrivateRoute';
import { App } from './containers/App/App';
import { CreateChatBots } from './containers/CreateChatBots/CreateChatBots';
// import EditChatbot from './containers/EditChatbot/EditChatbot';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_AUTH_ID } from './config';
import { ConfirmationProvider } from './providers/providers';
import Trail from "./containers/Trial/Trial";
import NotFound from './containers/NotFound/NotFound';
import ResetPassword from './containers/ResetPassword/ResetPassword';
import Unsubscribe from './containers/Unsubscribe/Unsubscribe';
import PassKeyForGmail from './containers/PassKey/PassKeyForGmail';
import nookies from 'nookies';
import GoogleSigninForCalendar from './containers/ChatBotsCustomize/GoogleSigninForCalendar';
import { CalendarProvider } from './containers/context/GoogleSigninContext';
import { VideoUploadProvider } from './containers/context/VideoUploadContext';

interface AppState {
	isAuthenticated: boolean;
}
interface AppProps { }

export class Base extends React.Component<AppProps, AppState> {
	public constructor(props: any) {
		const cookies = nookies.get(null);
		super(props);
		this.state = {
			isAuthenticated: !!cookies.accesstoken,
		};
		this.interceptor();
	}

	interceptor() {
		axios.interceptors.response.use(
			(response: any) => response,
			(error: any) => {
				if (error.response && error.response.status === 401) {
					removeAuthenticationDetails();
					this.setState({ isAuthenticated: false });
				}
				return Promise.reject(error);
			}
		);
		const cookies = nookies.get(null);
		if (!cookies.accesstoken) {
			this.setState({ isAuthenticated: false });
		} else {
			this.setState({ isAuthenticated: true });
			setAuthDetails(cookies.accesstoken as string);
		}
	}

	onLoginIn = (token: string) => {
		setAuthDetails(token as string);
		this.setState({ isAuthenticated: true });
	};

	onLoginOut = () => {
		removeAuthenticationDetails();
		this.setState({ isAuthenticated: false });
	};

	getAppRoutes = () => {
		return (
			<CalendarProvider>
				<Box>
					<Grid minH='100vh'>
						<ConfirmationProvider>
							<Router>
								<VideoUploadProvider>
									<Switch>
										<Route exact path='/signup'>
											<SignUp onSignUp={this.onLoginIn} />
										</Route>
										<Route exact path='/pricing-plan'>
											<SignUp onSignUp={this.onLoginIn} />
										</Route>
										<Route exact path='/login'>
											<Login onLoginIn={this.onLoginIn} />
										</Route>
										<Route exact path='/reset-password'>
											<ResetPassword />
										</Route>
										<Route exact path='/unsubscribe'>
											<Unsubscribe />
										</Route>
										<Route exact path='/campaign/callback/:provider'>
											<PassKeyForGmail />
										</Route>
										<Route exact path='/Calender/callback/googleCalender'>
											<GoogleSigninForCalendar />
										</Route>
										<Route exact path='/trialbot'>
											<Trail onLoginIn={this.onLoginIn} />
										</Route>
										<PrivateRoute
											isAuthenticated={this.state.isAuthenticated}
											exact
											path='/app/create-bot'
											component={CreateChatBots}
										/>

										<PrivateRoute
											isAuthenticated={this.state.isAuthenticated}
											path='/app'
											onLoginOut={this.onLoginOut}
											component={App}
										/>
										<PrivateRoute
											isAuthenticated={this.state.isAuthenticated}
											path='/'
											exact
											onLoginOut={this.onLoginOut}
											component={App}
										/>
										<Route>
											<NotFound />
										</Route>
									</Switch>
								</VideoUploadProvider>
							</Router>
						</ConfirmationProvider>
					</Grid>
				</Box>
			</CalendarProvider>
		);
	}

	render() {
		return (
			<ChakraProvider theme={theme}>
				{GOOGLE_AUTH_ID ? (
					<GoogleOAuthProvider clientId={GOOGLE_AUTH_ID}>
						{this.getAppRoutes()}
					</GoogleOAuthProvider>
				) : (
					this.getAppRoutes()
				)}
			</ChakraProvider>
		);
	}
}
