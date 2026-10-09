import {
	AbsoluteCenter,
	Box,
	Button,
	Divider,
	Flex,
	FormControl,
	FormErrorMessage,
	FormLabel,
	Heading,
	Input,
	InputGroup,
	Text,
	useToast,
	InputRightElement,
	useDisclosure
} from '@chakra-ui/react';
import * as React from 'react';
import ReCAPTCHA from "react-google-recaptcha";

import styles from './Login.module.scss';

import { Field, Form, Formik } from 'formik';

import { useState } from 'react';
import {
	Link,
	Redirect,
	RouteComponentProps,
	useHistory,
	withRouter,
} from 'react-router-dom';
import { Logo } from '../../components/Logo/Logo';
import { authGoogle, logIn } from '../../services/authServices';
import LoginWithGoogle from '../LoginWithGoogle/LoginWithGoogle';
import ForgotPassword from '../ForgotPassword/ForgotPassword';
import nookies from 'nookies';
import { callApi } from '../../services/callApi';
import axios from 'axios';
import { MdArrowBack } from 'react-icons/md';

export function validateEmailAddress(email: string) {
	return email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}
interface FormValues {
	username: string;
	password: string;
}
interface LoginProps extends RouteComponentProps {
	onLoginIn: (token: string, redirectTo?: string) => void;
}
function validateEmail(value: string) {
	let error;
	const trimmedValue = value?.trim();

	if (!trimmedValue) {
		error = 'Please enter your email.';
	} else if (validateEmailAddress(trimmedValue)) {
		error = 'Please enter a valid email address.';
	}

	return error;
}
function validatePassword(value: string) {
	let error;
	const trimmedValue = value?.trim();

	if (!trimmedValue) {
		error = 'Please enter a password.';
	}

	return error;
}
const Login = (props: LoginProps) => {
	const toast = useToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const history = useHistory()
	const [captchaValue, setCaptchaValue] = useState(null);
	const [submitEnabled, setSubmitEnabled] = useState(true);

	React.useEffect(() => {
		// Check for token in localStorage or cookies
		const cookies = nookies.get();
		const token = cookies.accesstoken;

		if (token) {
			// Verify token with your backend or just redirect to dashboard
			const routeState = props.location.state as any;
			const redirectTo = routeState?.redirectTo || '/app/dashboard';
			props.onLoginIn(token, redirectTo);
			setIsAuthenticated(true);
		}
	}, [props]);

	const handleCaptcha = async (value: any) => {
		setCaptchaValue(value);
		if (value) {
			try {
				const response = await axios.post(process.env?.REACT_APP_BASE_URL + "auth/verify-captcha", { token: value })
				setSubmitEnabled(false)

			} catch (error: any) {
				setSubmitEnabled(false)
				showLimitedToast({
					title: error?.response?.data?.message || error?.message || 'Error verifying CAPTCHA',
					status: 'error',
					isClosable: true,
				});
			}
		}


	};
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [show, setShow] = React.useState(false);
	const lastToastRef = React.useRef<{ title: string; status?: string; time: number; id: string } | null>(null);

	const showLimitedToast = React.useCallback(
		(options: any) => {
			if (!options || (!options.title && options.title !== '')) return;

			let titleString = '';
			if (typeof options.title === 'string') {
				titleString = options.title.trim();
			} else if (options.title) {
				titleString = String(options.title).trim();
			}

			if (!titleString || titleString === 'undefined') {
				titleString = options.status === 'error' ? 'An unexpected error occurred.' : 'Notification';
			}

			const now = Date.now();
			const status = options.status || 'info';

			const lastToast = lastToastRef.current;
			const isSameMessage =
				lastToast &&
				lastToast.title === titleString &&
				lastToast.status === status;

			const isCurrentlyActive = lastToast?.id ? toast.isActive(lastToast.id) : false;

			if (isSameMessage && isCurrentlyActive && now - lastToast.time < 3500) {
				return;
			}

			toast.closeAll();

			const newToastId =
				options.id ||
				`toast-${status}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

			lastToastRef.current = {
				title: titleString,
				status,
				time: now,
				id: newToastId,
			};

			toast({
				duration: 4000,
				isClosable: true,
				...options,
				id: newToastId,
				title: titleString,
			});
		},
		[toast]
	);

	const responseGoogleSuccess = React.useCallback((googleResponse: any) => {
		async function googleLogin() {
			try {
				const response: any = await authGoogle({
					token: googleResponse.access_token,
				});
				// console.log("response", response)
				if (!response?.data?.hasValidSubscription) {
					showLimitedToast({
						title: "You’re not on an active plan yet. Pick the best plan for your needs!",
						status: "warning",
						isClosable: true,
					});
					setTimeout(() => {
						history.push("/pricing-plan", {
							data: {
								email: response?.data?.email || "",
								token: response?.data?.access
							}
						})
					}, 1000)
				} else {
					const routeState = props.location.state as any;
					// console.log("routeState", routeState)
					const redirectTo = routeState?.redirectTo || '/app/dashboard';
					props.onLoginIn(
						response.data.access,
						redirectTo
					);
					localStorage.setItem("userLoggedIn", Date.now().toString());

					setIsAuthenticated(true);

				}


			} catch (error: any) {
				let title = 'Oops! Something went wrong!';
				const errors = error?.response?.data?.nonFieldErrors;
				if (errors) {
					title = errors
				}
				showLimitedToast({
					title: error?.response?.data?.message || error?.message || title,
					status: "error",
					isClosable: true,
				});
			}
		}
		googleLogin();
	}, [props, showLimitedToast])

	const responseGoogleFailure = React.useCallback((error) => {
		let title = 'Oops! Something went wrong!';
		showLimitedToast({
			title: error?.response?.data?.message || error?.message || title,
			status: "error",
			isClosable: true,
		});
	}, [showLimitedToast])


	if (isAuthenticated) {
		const routeState = props.location.state as any;
		const redirectTo = routeState?.redirectTo || '';
		return <Redirect to={"/app/dashboard" || redirectTo} />;
	}
	const initialValues: FormValues = { password: '', username: '' };

	const handleClick = () => setShow(!show);

	return (<>
		<Flex bg='#F7FAFC' h='100vh' direction='column'>
			<Flex
				shrink={0}
				shadow='base'
				w='100%'
				h='60px'
				bg='white'
				pr='10'
				pb='4'
				pt='4'
				pl='10'
				zIndex='2'
				alignItems='center'
				display={"flex"}
				justifyContent={"space-between"}
			>
				<Logo></Logo>

				<Button
					leftIcon={<MdArrowBack />}
					variant="outline"
					borderColor="#F8F9FA"
					color="#1A202C"
					height="38px"
					px="12px"
					borderRadius="4px"
					fontWeight="400"
					fontSize="16px"
					boxShadow={"md"}
					_hover={{ bg: "gray.50" }}
					onClick={() => window.location.href = "https://ultimabot.ai/"}
				>
					Back to Website
				</Button>

			</Flex>
			<Box overflow={'auto'}>
				<Heading
					textAlign='center'
					fontSize='24px'
					as='h3'
					mt='24px'
					mb="40px"
					color="#1A202C"
				>
					Welcome Back
				</Heading>
				<Flex alignItems='center' justifyContent='center'>
					<Box
						bg='#fff'
						p='24px 24px'
						shadow='md'
						width={476}
						maxW="90vw"
						borderRadius='md'
						m='0 auto'
						border="2px solid #DEE2E6"
						boxShadow="none"
					>
						<Heading
							textAlign='left'
							fontSize='20px'
							as='h5'
							isTruncated
							mb='4px'
							fontWeight="600"
							color="#1A202C"
						>
							Sign in
						</Heading>
						<Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="24px">
							{/* Sign in into your UltimaBot Account. */}
							Sign into your UltimaBot account
						</Text>
						<Formik
							initialValues={initialValues}
							onSubmit={async (values: FormValues, actions) => {
								try {
									setIsLoading(true)
									const trimmedUsername = values.username.trim();
									const trimmedPassword = values.password.trim();

									const response: any = await logIn({
										username: trimmedUsername,
										password: trimmedPassword,
									});
									// console.log("response", response);
									if (!response?.data?.hasValidSubscription) {
										showLimitedToast({
											title: "You’re not on an active plan yet. Pick the best plan for your needs!",
											status: "warning",
											isClosable: true,
										});
										setTimeout(() => {
											history.push("/pricing-plan", {
												data: {
													email: trimmedUsername,
													token: response?.data?.access
												}
											})
										}, 1000)
									} else {

										const routeState = props.location.state as any;
										const redirectTo = routeState?.redirectTo || '/app/dashboard';
										localStorage.setItem("userLoggedIn", Date.now().toString());
										if (!localStorage.getItem("tabId")) {
											localStorage.setItem("tabId", Math.random().toString(36).substring(2));
										}
										setIsLoading(false)
										// localStorage.setItem("active_tab", window.name || "main");

										props.onLoginIn(
											response.data.access,
											redirectTo
										);
										setIsAuthenticated(true);
									}

								} catch (error: any) {
									setIsLoading(false);
									showLimitedToast({
										title: error.response?.data?.message || error?.message || 'Invalid credentials',
										status: 'error',
										isClosable: true,
									});
									actions.setSubmitting(false);
									if (error?.response?.data?.isVerified === false) {
										history.push(`/signup?step=verify&email=${error?.response?.data?.email}`);
									}
								}
							}}
						>
							{(props) => (
								<Form>
									<Field
										type='email'
										name='username'
										validate={validateEmail}
									>
										{({ field, form }: any) => (
											<FormControl
												isInvalid={
													form.errors.username &&
													form.touched.username
												}
												mb='26px'
											>
												<FormLabel
													htmlFor='username'
													fontSize='16px'
													fontWeight="400"
													color="#212529"
												>
													Email
												</FormLabel>
												<Input
													{...field}
													id='username'
													placeholder='company@mail.com'
													sx={{
														'&:-webkit-autofill': {
															boxShadow: '0 0 0px 1000px white inset',
															WebkitTextFillColor: '#000',
														},
													}}
												/>
												<FormErrorMessage>
													{form.errors.username}
												</FormErrorMessage>
											</FormControl>
										)}
									</Field>
									<Field
										type='password'
										name='password'
										validate={validatePassword}
									>
										{({ field, form }: any) => (
											<FormControl
												isInvalid={
													form.errors.password &&
													form.touched.password
												}
												mb='2'
											>
												<FormLabel

													htmlFor='password'
													fontSize='16px'
													fontWeight="400"
													color="#212529"
												>
													Password
												</FormLabel>

												<InputGroup size='md'>
													<Input
														pr='4.5rem'
														{...field}
														type={show ? 'text' : 'password'}
														placeholder='********'
													/>
													<InputRightElement>
														<Box onClick={handleClick}>
															{show ? <><svg width="16px" height="16px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<g clip-path="url(#clip0_1003_1703)">
																	<path d="M15.9998 7.99915C15.9998 7.99915 12.9998 2.49915 7.99976 2.49915C2.99976 2.49915 -0.000244141 7.99915 -0.000244141 7.99915C-0.000244141 7.99915 2.99976 13.4991 7.99976 13.4991C12.9998 13.4991 15.9998 7.99915 15.9998 7.99915ZM1.17276 7.99915C1.65627 7.26427 2.2124 6.57983 2.83276 5.95615C4.11976 4.66715 5.87976 3.49915 7.99976 3.49915C10.1198 3.49915 11.8788 4.66715 13.1678 5.95615C13.7881 6.57983 14.3442 7.26427 14.8278 7.99915C14.7698 8.08615 14.7058 8.18215 14.6328 8.28715C14.2978 8.76715 13.8028 9.40715 13.1678 10.0421C11.8788 11.3311 10.1188 12.4991 7.99976 12.4991C5.87976 12.4991 4.12076 11.3311 2.83176 10.0421C2.2114 9.41846 1.65628 8.73402 1.17276 7.99915Z" fill="#6C757D" />
																	<path d="M7.99976 5.49915C7.33671 5.49915 6.70083 5.76254 6.23199 6.23138C5.76315 6.70022 5.49976 7.3361 5.49976 7.99915C5.49976 8.66219 5.76315 9.29807 6.23199 9.76691C6.70083 10.2358 7.33671 10.4991 7.99976 10.4991C8.6628 10.4991 9.29868 10.2358 9.76752 9.76691C10.2364 9.29807 10.4998 8.66219 10.4998 7.99915C10.4998 7.3361 10.2364 6.70022 9.76752 6.23138C9.29868 5.76254 8.6628 5.49915 7.99976 5.49915ZM4.49976 7.99915C4.49976 7.07089 4.86851 6.18065 5.52488 5.52427C6.18126 4.86789 7.0715 4.49915 7.99976 4.49915C8.92801 4.49915 9.81825 4.86789 10.4746 5.52427C11.131 6.18065 11.4998 7.07089 11.4998 7.99915C11.4998 8.9274 11.131 9.81764 10.4746 10.474C9.81825 11.1304 8.92801 11.4991 7.99976 11.4991C7.0715 11.4991 6.18126 11.1304 5.52488 10.474C4.86851 9.81764 4.49976 8.9274 4.49976 7.99915Z" fill="#6C757D" />
																</g>
																<defs>
																	<clipPath id="clip0_1003_1703">
																		<rect width="16" height="16" fill="white" />
																	</clipPath>
																</defs>
															</svg></> : <><svg width="16px" height="16px" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M1 1.27L2.28 0L19 16.72L17.73 18L14.65 14.92C13.5 15.3 12.28 15.5 11 15.5C6 15.5 1.73 12.39 0 8C0.69 6.24 1.79 4.69 3.19 3.46L1 1.27ZM11 5C11.7956 5 12.5587 5.31607 13.1213 5.87868C13.6839 6.44129 14 7.20435 14 8C14.0005 8.34057 13.943 8.67873 13.83 9L10 5.17C10.3213 5.05698 10.6594 4.99949 11 5ZM11 0.5C16 0.5 20.27 3.61 22 8C21.1834 10.0729 19.7966 11.8723 18 13.19L16.58 11.76C17.9629 10.8034 19.0783 9.5091 19.82 8C19.0117 6.34987 17.7565 4.95963 16.1974 3.98735C14.6382 3.01508 12.8375 2.49976 11 2.5C9.91 2.5 8.84 2.68 7.84 3L6.3 1.47C7.74 0.85 9.33 0.5 11 0.5ZM2.18 8C2.98835 9.65014 4.24345 11.0404 5.80264 12.0126C7.36182 12.9849 9.16251 13.5002 11 13.5C11.69 13.5 12.37 13.43 13 13.29L10.72 11C10.0242 10.9254 9.37482 10.6149 8.87997 10.12C8.38512 9.62518 8.07458 8.97584 8 8.28L4.6 4.87C3.61 5.72 2.78 6.78 2.18 8Z" fill="#6C757D" />
															</svg>
															</>}
														</Box>
													</InputRightElement>
												</InputGroup>
												<FormErrorMessage>
													{form.errors.password}
												</FormErrorMessage>
											</FormControl>
										)}
									</Field>
									<Link to={'#'} onClick={onOpen}>
										<Text mb="10px" textAlign="left" color="#2977FF" fontSize={'14px'}>
											Forgot your password?
										</Text>
									</Link>

									<ReCAPTCHA
										sitekey={process.env.SITEKEY || "6LfFAyAsAAAAAAszYTTwpyK-bKQayaDaKEjz4fAU"}
										onChange={handleCaptcha}
									/>
									<Button
										colorScheme="blue"
										className="btn-hover-pri"
										variant='solid'
										mt={4}
										isFullWidth
										isLoading={isLoading}
										isDisabled={submitEnabled || isLoading}
										size='md'
										type='submit'
										fontWeight={500}
									>
										Sign in
									</Button>

								</Form>
							)}
						</Formik>
						<Box>
							<Box position='relative' mt="30.5px" mb="30.5px">
								<Divider color="#E2E8F0" />
								<AbsoluteCenter bg='white' px='4' color="#6C757D" fontSize="14px">
									Don't have an account
								</AbsoluteCenter>
							</Box>

							<Link to='/signup'>
								<Button
									backgroundColor="white"
									color={"#2977FF"}
									variant='solid'
									border="2px solid"

									isFullWidth
									size='md'
									fontWeight={500}

									className='btn-hover-sen'
								>
									Sign up
								</Button>
							</Link>

							<Box marginTop={"10px"}>
								<Link to={'#'}>
									<LoginWithGoogle
										responseGoogleSuccess={responseGoogleSuccess}
										responseGoogleFailure={responseGoogleFailure}
										buttonText="Login with Google"
									/>
								</Link>
							</Box>

						</Box>
					</Box>
				</Flex>
			</Box >
		</Flex >

		<ForgotPassword isOpen={isOpen} onClose={onClose} />
	</>);

};

export default withRouter(Login);
