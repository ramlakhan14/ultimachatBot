import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	FormControl,
	FormErrorMessage,
	FormLabel,
	Heading,
	Progress,
	SimpleGrid,
	Input,
	Divider,
	AbsoluteCenter,
	Text,
	useToast,
	Image,
	InputRightElement,
	InputGroup,
	VStack,
	Badge,
	HStack,
	Icon,
	List,
	ListItem,
	ListIcon,
} from '@chakra-ui/react';
import ReCAPTCHA from "react-google-recaptcha";


import { Field, Form, Formik } from 'formik';

import styles from './SignUp.module.scss';
import { authGoogle, otpVerification, resendOtp, signUp, userPaymentstatus } from '../../services/authServices';
import {
	Link,
	RouteComponentProps,
	useHistory,
	useLocation,
	withRouter,
} from 'react-router-dom';
import { Logo } from '../../components/Logo/Logo';
import LoginWithGoogle from '../LoginWithGoogle/LoginWithGoogle';
import { PricingCard } from '../../components/Pricing/PricingCard';
import Lottie from 'lottie-react';
import animationData from './Animation.json';
import axios from 'axios';
import { CheckCircleIcon, CheckIcon } from '@phosphor-icons/react';
import { FaBriefcase, FaCrown, FaGem, FaInfinity, FaRocket } from 'react-icons/fa';
import { MdArrowBack } from 'react-icons/md';
export function validateEmailAddress(email: string) {
	return email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}
interface FormValues {
	email: string;
	password: string;
}
interface SignUpProps extends RouteComponentProps {
	onSignUp: (token: string, redirectTo?: string) => void;
}


function validateEmail(value: string) {
	let error;
	const trimmedValue = value?.trim();

	if (!trimmedValue) {
		error = "Please enter your email.";
	} else if (validateEmailAddress(trimmedValue)) {
		error = "Please enter a valid email address.";
	}

	return error;
}

const SignUp = (props: SignUpProps) => {
	const toast = useToast();
	let history = useHistory();
	const pathname = window.location.pathname === "/pricing-plan"
	const { state }: any = useLocation()
	const [singUpDiv, setSingUpDiv] = React.useState(!pathname);
	const [priceDiv, setPriceDiv] = React.useState(pathname || false);
	const [userData, setUserData] = React.useState<any>(null);
	const [animationDiv, setAnimationDiv] = React.useState(false);
	// console.log("window.location.pathname", state);
	// const [progressBar, setProgressBar] = React.useState(pathname ? 66.2 : 33);
	const [progressBar, setProgressBar] = React.useState(pathname ? 75 : 25);
	const [userEmail, setUserEmail] = React.useState<any>(state?.data?.email || null);
	const [show, setShow] = React.useState(false);
	const [isYearly, setIsYearly] = React.useState(false);
	const [verifyDiv, setVerifyDiv] = React.useState(false);
	const [verifyCode, setVerifyCode] = React.useState('');
	const [verifyError, setVerifyError] = React.useState('');
	const [isVerifying, setIsVerifying] = React.useState(false);
	const [resendTimer, setResendTimer] = React.useState(30);
	const [isResetBtn, setIsRestBtn] = React.useState(false);
	const captchaRef = React.useRef<ReCAPTCHA>(null);
	const timerRef = React.useRef<any>(null);

	const googleLoginWithPayment = () => {
		setProgressBar(75);
		setSingUpDiv(false);
		setPriceDiv(true);
	}

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
				const response = await authGoogle({
					token: googleResponse.access_token,
				});

				// console.log("google login response", response.data);
				const routeState = props.location.state as any;
				const redirectTo = routeState?.redirectTo || '';
				props.onSignUp(response.data.access, redirectTo);
				setUserEmail(response.data.email);
				setUserData(response.data)
				props.onSignUp(response.data.access);
				googleLoginWithPayment();
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
	}, [history, props, showLimitedToast])

	const responseGoogleFailure = React.useCallback((error: any) => {

		let title = 'Oops! Something went wrong!';
		showLimitedToast({
			title: error?.response?.data?.message || error?.message || title,
			status: "error",
			isClosable: true,
		});
	}, [showLimitedToast]);
	const goToDashboard = () => {
		history.push('/app/dashboard');
	}

	const intervalRef = React.useRef<any>(null);

	const handleClick = () => setShow(!show);
	const checkSubscriptionStatus = async () => {
		try {
			const response: any = await userPaymentstatus(state?.data?.email ? { access: state?.data?.token } : userData);
			// console.log("response", response);
			if (response?.data?.status == 'active') {
				// Only call paymentStatus if the subscription is active
				if (state?.data?.type == "newplan") {
					// history.goBack()
					history.push('/app/myprofile')
				} else {
					if (userData.access) {
						props.onSignUp(userData.access);
					}
					showAnimation();
					clearInterval(intervalRef.current);
				}
				// clearInterval(intervalId);
			} else {
				// Handle the case where the subscription is not active, if necessary
			}
		} catch (error) {
			// console.error('Error fetching payment status:', error);
			// Handle errors if the request fails
		}
	}


	React.useEffect(() => {

		// Run interval only once
		intervalRef.current = setInterval(() => {
			if (progressBar === 75) {
				if (!(state?.data?.type == "upgrade")) {
					checkSubscriptionStatus();
				}
			} else if (progressBar > 75) {
				clearInterval(intervalRef.current);
			}
		}, 5000);

		return () => {
			// Cleanup on unmount
			clearInterval(intervalRef.current);
		};

	}, [progressBar]);



	const singupUser = () => {
		setProgressBar(50);
		setSingUpDiv(false);
		setVerifyDiv(true);
	}
	const showAnimation = () => {
		setProgressBar(100);
		setSingUpDiv(false);
		setPriceDiv(false);
		setAnimationDiv(true)
	}
	const [captchaValue, setCaptchaValue] = React.useState(null);
	const [submitEnabled, setSubmitEnabled] = React.useState(true);
	const [loading, setLoading] = React.useState(false);

	const handleCaptcha = async (value: any) => {
		setCaptchaValue(value);
		if (value) {
			try {
				const response: any = await axios.post(process.env?.REACT_APP_BASE_URL + "auth/verify-captcha", { token: value })
				setSubmitEnabled(false)
				// console.log("response", response)
				// const data = await response

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



	function validatePassword(value: string) {
		let error;
		const trimmedValue = value?.trim();

		if (!trimmedValue) {
			error = "Please enter a password.";
		} else if (value.length < 8) {
			error = "Password must be at least 8 characters.";
		} else if (value.length > 16) {
			error = "Password must be no more than 16 characters.";
		} else if (!/[A-Z]/.test(value)) {
			error = "Password must contain at least one uppercase letter.";
		} else if (!/[a-z]/.test(value)) {
			error = "Password must contain at least one lowercase letter.";
		} else if (!/[0-9]/.test(value)) {
			error = "Password must contain at least one number.";
		} else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
			error = "Password must contain at least one special character.";
		}
		return error;
	}


	const plans = [
		{
			title: "Starter",
			price: isYearly ? "470" : "49",
			type: isYearly ? "yearly" : "monthly",
			saveUpto: "118",
			yearlyFullPrice: "588",
			userEmail: userEmail,
			botLimit: "5 Bots",
			bonusCredits: "1,000",
			description: "For freelancers or small business",
			icon: FaRocket,
			features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
		},
		{
			title: "Pro",
			userEmail: userEmail,
			price: isYearly ? "950" : "99",
			type: isYearly ? "yearly" : "monthly",
			saveUpto: "238",
			yearlyFullPrice: "1188",
			botLimit: "10 Bots",
			bonusCredits: "2,500",
			isPopular: true,
			description: "Best for teams running multi-channel campaigns.",
			icon: FaCrown,
			features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
		},
		{
			title: "Agency",
			userEmail: userEmail,
			price: isYearly ? "1430" : "149",
			type: isYearly ? "yearly" : "monthly",
			botLimit: "20 Bots",
			saveUpto: "358",
			yearlyFullPrice: "1788",
			bonusCredits: "3,500",
			description: "For agencies managing multiple clients & campaigns.",
			icon: FaBriefcase,
			features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
		},
		{
			title: "Ultimate",
			userEmail: userEmail,
			price: isYearly ? "2870" : "299",
			type: isYearly ? "yearly" : "monthly",
			saveUpto: "718",
			yearlyFullPrice: "3588",
			botLimit: "Unlimited Bots",
			bonusCredits: "5,000",
			description: "For heavy volume users, SaaS founders & enterprise workloads.",
			icon: FaGem,
			features: ["ChatBot", "Email Assistant", "Inbound VoiceBot", "Email Outreach", "Outbound VoiceBot"]
		}
	];

	React.useEffect(() => {
		if (!verifyDiv) return;

		// clear any existing timer first
		if (timerRef.current) clearInterval(timerRef.current);

		setResendTimer(30);

		timerRef.current = setInterval(() => {
			setResendTimer((prev) => {
				if (prev <= 1) {
					clearInterval(timerRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timerRef.current);
	}, [verifyDiv])

	const handleVerifyCode = async () => {
		if (!verifyCode || verifyCode.length < 6) {
			setVerifyError('Please enter a valid verification code.');
			return;
		}
		setIsVerifying(true);
		try {
			const payload: any = {
				"email": userEmail,
				"otp": verifyCode
			}
			const response = await otpVerification(payload);
			setUserData(response.data)
			props.onSignUp(response.data.access);
			setVerifyError(response?.data?.message);
			setProgressBar(75);
			setVerifyDiv(false);
			setPriceDiv(true);
			checkSubscriptionStatus();
			showLimitedToast({
				title: response?.data?.message || 'Email verified successfully',
				status: "success",
				isClosable: true,
			});
		} catch (error: any) {
			showLimitedToast({
				title: error.response?.data?.message || error?.message || 'Verification failed',
				status: 'error',
				isClosable: true,
			});
		} finally {
			setIsVerifying(false);
		}
	};

	const handleResendCode = async () => {
		setIsRestBtn(true);
		try {
			const payload: any = {
				"email": userEmail,
			}
			const response = await resendOtp(payload)
			setResendTimer(30); // restart timer
			timerRef.current = setInterval(() => {
				setResendTimer((prev) => {
					if (prev <= 1) {
						clearInterval(timerRef.current);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			showLimitedToast({ title: response?.data?.message || 'Verification code resent successfully', status: 'success', isClosable: true });
		} catch (error: any) {
			showLimitedToast({
				title: error?.response?.data?.message || 'Failed to resend code.',
				status: 'error',
				isClosable: true,
			});
		} finally {
			setIsRestBtn(false);
		}
	};

	const iconCheck = () => <svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path fill-rule="evenodd" clip-rule="evenodd" d="M16.4337 0.351344C16.6586 0.576377 16.785 0.881547 16.785 1.19974C16.785 1.51794 16.6586 1.82311 16.4337 2.04814L6.83365 11.6481C6.60862 11.8731 6.30345 11.9995 5.98525 11.9995C5.66706 11.9995 5.36189 11.8731 5.13685 11.6481L0.336854 6.84814C0.118264 6.62182 -0.00268874 6.3187 4.53632e-05 6.00406C0.00277947 5.68943 0.128982 5.38845 0.351472 5.16596C0.573962 4.94347 0.874936 4.81727 1.18957 4.81454C1.50421 4.8118 1.80733 4.93275 2.03365 5.15134L5.98525 9.10294L14.7369 0.351344C14.9619 0.126379 15.2671 0 15.5853 0C15.9035 0 16.2086 0.126379 16.4337 0.351344Z" fill="#2977FF"></path>
	</svg>;

	React.useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const step = params.get('step');
		const email = params.get('email');

		if (step === 'verify' && email) {
			setUserEmail(email);
			setSingUpDiv(false);
			setVerifyDiv(true);
			setProgressBar(50);
		}
	}, []);

	return (
		<Flex bg='#F7FAFC' h='100vh' direction='column' overflow={'auto'}>
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
				<Box
					cursor={"pointer"}
					onClick={() => {
						history.goBack()
					}}>
					<Logo ></Logo>
				</Box>
				{
					pathname ?
						<Button
							leftIcon={<MdArrowBack />}
							variant="outline"
							borderColor="#F8F9FA"
							color="#1A202C"
							height="38px"
							px="12px"
							borderRadius="4px"
							fontWeight="500"
							fontSize="16px"
							boxShadow={"md"}
							_hover={{ bg: "gray.50" }}
							onClick={() => {
								history.goBack()
							}}
						>
							Back to Profile
						</Button> :
						<Button
							leftIcon={<MdArrowBack />}
							variant="outline"
							borderColor="#F8F9FA"
							color="#1A202C"
							height="38px"
							boxShadow={"md"}
							px="12px"
							borderRadius="4px"
							fontWeight="400"
							fontSize="16px"
							_hover={{ bg: "gray.50" }}
							onClick={() => window.location.href = "https://ultimabot.ai/"}
						>
							Back to Website
						</Button>
				}

			</Flex>
			<Box overflow={'auto'}>
				{
					!pathname &&
					<Box textAlign="center">
						<Heading
							textAlign='center'
							fontSize='30px'
							as='h3'
							mt='24px'
							mb="4px"
							color="#1A202C"
						>
							Create Account
						</Heading>
						<Text as="p" fontSize="16px" fontWeight="400" color="#6C757D">
							Unlock 24/7 Customer & Sales Support For Your Business Today!
						</Text>
						<Box width="100%" marginTop="72px" marginBottom="78px">
							<Box position="relative" margin="0px 154px">
								{/* White Background behind Progress Bar */}
								<Box position="absolute" bottom="100%" left="0" width="100%" height="48px" backgroundColor="white" borderRadius="2px" />

								{/* Progress Bar */}
								<Progress value={progressBar} colorScheme="blue" height="10px" border="2px solid #2977FF" />

								{/* Dividers */}
								<Box position="absolute" top="0" width="100%" height="100%">
									<Box position="absolute" left="25%" height="100%" borderLeft="2px solid #2977FF" />
									<Box position="absolute" left="50%" height="100%" borderLeft="2px solid #2977FF" />
									<Box position="absolute" left="75%" height="100%" borderLeft="2px solid #2977FF" />
								</Box>

								{/* Step Labels */}
								<Flex justify="space-around" position="absolute" top="0" width="100%" mt="14px">
									<Text fontSize="16px" fontWeight="bold" color="#212529">Sign up</Text>
									<Text fontSize="16px" fontWeight="bold" color="#212529">Verify</Text>
									<Text fontSize="16px" fontWeight="bold" color="#212529">Payment</Text>
									<Text fontSize="16px" fontWeight="bold" color="#212529">Complete</Text>
								</Flex>
							</Box>
						</Box>
					</Box>
				}

				<Flex alignItems='center' justifyContent='center'
					display={singUpDiv === true ? "block" : "none"}
				>
					<Box
						bg='#fff'
						p='24px 24px '
						shadow='md'
						width={476}
						maxW="90vw"
						borderRadius='4px'
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
							Create Account
						</Heading>
						<Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="24px">
							Create your UltimaBot account to get started.
						</Text>
						<Formik
							initialValues={{ email: '', password: '' }}
							onSubmit={async (values: FormValues, actions) => {
								try {
									setLoading(true);
									if (loading) return;
									const trimmedEmail = values.email.trim();
									const trimmedPassword = values.password.trim();

									const response = await signUp({
										email: trimmedEmail,
										password: trimmedPassword,
										// confirmPassword: values.password,
										avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${trimmedEmail}&radius=50&backgroundColor=2977ff&textColor=ffffff&chars=1`
									});

									setLoading(false);

									setUserEmail(response.data.email);
									// props.onSignUp(response.data.access);
									singupUser();
									showLimitedToast({
										title: response?.data?.message || 'Account created successfully',
										status: "success",
										isClosable: true,
									});
									actions.setSubmitting(false);
								} catch (error: any) {
									setLoading(false);
									validatePassword(values.password);
									showLimitedToast({
										title: error.response?.data?.message || error?.message || 'Sign up failed',
										status: 'error',
										isClosable: true,
									});
									actions.setSubmitting(false);
								}
							}}
						>
							{(props) => (
								<Form>
									<Field
										type='email'
										name='email'
										validate={validateEmail}
									>
										{({ field, form }: any) => (
											<FormControl
												mb='6'
												isInvalid={
													form.errors.email &&
													form.touched.email
												}
											>
												<FormLabel
													// fontSize='sm'
													htmlFor='email'
													fontSize='16px'
													fontWeight="400"
													color="#212529"
												>
													Email Address
												</FormLabel>
												<Input
													{...field}
													id='email'
													placeholder='company@mail.com'
												/>
												<FormErrorMessage>
													{form.errors.email}
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
												mb='6'
												isInvalid={
													form.errors.password &&
													form.touched.password
												}
											>
												<FormLabel
													// fontSize='sm'
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
													<Text as="span" dangerouslySetInnerHTML={{ __html: form.errors.password }} />
												</FormErrorMessage>
											</FormControl>
										)}
									</Field>

									<Box>
										<ReCAPTCHA
											ref={captchaRef}
											sitekey={process.env.SITEKEY || "6LfFAyAsAAAAAAszYTTwpyK-bKQayaDaKEjz4fAU"}
											onChange={handleCaptcha}
										/>
									</Box>
									<Button
										colorScheme="blue"
										className="btn-hover-pri"
										variant='solid'
										mt={4}
										isLoading={loading}
										isFullWidth
										fontWeight={500}
										size='md'
										disabled={loading || submitEnabled}

										type='submit'
									>
										Create Account
									</Button>

								</Form>
							)}
						</Formik>
						<Box>
							<Box position='relative' mt="30.5px" mb="30.5px">
								<Divider color="#E2E8F0" />
								<AbsoluteCenter bg='white' px='4' color="#6C757D" fontSize="14px">
									Already have an account?
								</AbsoluteCenter>
							</Box>
							<Link to='/login'>
								<Button
									backgroundColor="white"
									color={"#2977FF"}
									variant='solid'
									border="2px solid"
									fontWeight={500}
									isFullWidth
									size='md'
									className='btn-hover-sen'
								>
									Sign in
								</Button>
							</Link>

							<Box marginTop={"16px"}>
								<Link to={'#'}>
									<LoginWithGoogle
										responseGoogleSuccess={responseGoogleSuccess}
										responseGoogleFailure={responseGoogleFailure}
										buttonText="Continue with Google"
									/>
								</Link>
							</Box>
						</Box>
					</Box>
				</Flex>
				{/* ── Verify Code Step ── */}
				<Flex alignItems='center' justifyContent='center'
					display={verifyDiv === true ? "block" : "none"}
				>
					<Box
						bg='#fff'
						p='24px'
						width={476}
						maxW="90vw"
						borderRadius='4px'
						m='0 auto'
						border="2px solid #DEE2E6"
						boxShadow="none"
					>
						{/* Back Button */}
						<Button
							leftIcon={<MdArrowBack />}
							variant="ghost"
							color="#1A202C"
							fontSize="16px"
							fontWeight="500"
							px={0}
							mb="16px"
							_hover={{ bg: 'transparent', color: '#1A202C' }}
							onClick={() => {
								setVerifyDiv(false);
								setSingUpDiv(true);
								setProgressBar(25);
								setVerifyCode('');
								setVerifyError('');
								setResendTimer(30);
								captchaRef.current?.reset();
								setSubmitEnabled(true);
							}}
						>
							Back
						</Button>
						<Heading fontSize='20px' as='h5' mb='4px' fontWeight="600" color="#1A202C">
							Verify Your Email
						</Heading>
						<Text as="p" fontSize="16px" fontWeight="400" color="#6C757D" mb="24px">
							We've sent a verification code to <b style={{ color: "#2977FF" }}>{userEmail}</b>. Please enter it below.
						</Text>

						<FormControl mb='6' isInvalid={!!verifyError}>
							<FormLabel fontSize='16px' fontWeight="400" color="#212529">
								Verification Code
							</FormLabel>
							<Input
								placeholder='Enter your code'
								value={verifyCode}
								onChange={(e) => {
									const numericValue = e.target.value.replace(/\D/g, '');
									if (numericValue.length <= 6) {
										setVerifyCode(numericValue);
										setVerifyError('');
									}
								}}
								maxLength={6}
								inputMode="numeric"
								pattern="[0-9]*"
							/>
							{verifyError && (
								<FormErrorMessage>{verifyError}</FormErrorMessage>
							)}
						</FormControl>

						<Button
							colorScheme="blue"
							variant='solid'
							isFullWidth
							fontWeight={500}
							size='md'
							isLoading={isVerifying}
							onClick={handleVerifyCode}
						>
							Verify & Continue
						</Button>

						<Text mt="16px" fontSize="14px" color="#6C757D" textAlign="center">
							Didn't receive a code?{' '}
							{resendTimer > 0 ? (
								<Text as="span" color="#2977FF" fontWeight={500}>
									Resend in {resendTimer}s
								</Text>
							) : (
								<Text
									as="span"
									color={isResetBtn ? "gray.400" : "#2977FF"}
									cursor={isResetBtn ? "not-allowed" : "pointer"}
									fontWeight={500}
									onClick={!isResetBtn ? handleResendCode : undefined}
								>
									Resend
								</Text>
							)}
						</Text>
					</Box>
				</Flex>

				<Flex px={10} pt={priceDiv ? "20px" : ""} display={priceDiv === true ? "block" : "none"} >
					<Box
						bg='#fff'
						p='24px 24px '
						shadow='md'
						width={"100%"}
						borderRadius='4px'
						m='0 auto'
						marginBottom="24px"
						border="2px solid #DEE2E6"
						boxShadow="none"
					>

						<VStack spacing={6} py={5} textAlign="center">
							<VStack spacing={2}>
								<Heading as="h2" fontWeight={"700"} fontSize="24px" color="#1A202C">
									Pricing
								</Heading>
								<Text fontSize="16px" color="#6C757D" fontWeight={"400"}>
									Full access to every feature on all plans. Only the number of bots scales.
								</Text>
							</VStack>

							{/* Toggle Container */}
							<Box
								p={1}
								bg="white"
								borderRadius="full"
								border="1px solid"
								borderColor="gray.100"
								boxShadow="sm"
							>
								<HStack spacing={0}>
									<Button
										size="md"
										borderRadius="20px!important"
										px={8}
										fontWeight={500}
										fontSize="14px"
										bg={!isYearly ? "#2977FF" : "transparent"}
										color={!isYearly ? "white" : "#6C757D"}
										_hover={{ bg: !isYearly ? "#2977FF" : "gray.50" }}
										onClick={() => setIsYearly(false)}
										// Custom purple color from the image
										backgroundColor={!isYearly ? "#2977FF" : "transparent"}
									>
										Monthly plan
									</Button>

									<HStack
										as="button"
										onClick={() => setIsYearly(true)}
										spacing={2}
										px={8}
										borderRadius="20px!important"
										py={2}
										bg={isYearly ? "#2977FF" : "transparent"}
										transition="all 0.2s"
									>
										<Text
											fontWeight="500"
											color={isYearly ? "white" : "#6C757D"}
											fontSize="14px"
										>
											Yearly plan
										</Text>
										<Badge
											colorScheme="blue"
											variant="solid"
											borderRadius="full"
											px={2}
											py={1}
											fontSize="xs"
											bg="#1D54B5" // Darker purple for the "Save" badge
											color="white"
											textTransform="none"
											fontWeight={500}
										>
											Save up to 20%
										</Badge>
									</HStack>
								</HStack>
							</Box>
						</VStack>

						<SimpleGrid mb={"24px"} mt={"35px"} columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mx="auto">
							{plans.map((plan: any, index) => {
								// console.log("state?.data", state?.data, plan);
								// const isCurrentSubscription = state?.data?.activeSubscription?.toLowerCase() == plan?.title?.toLowerCase()
								return (
									<PricingCard key={index} {...plan} />
								)
							})}
						</SimpleGrid>

						<Divider />

						{/* Bottom Features List */}
						<VStack mt={6} spacing={"10px"} align="center">
							<HStack><Icon as={iconCheck} fontSize="16px" color="#2977FF" /><Text fontSize="16px" color={"#524D4D"} fontWeight={"500"}><Text as={'span'} fontWeight={600}>All plans include</Text> Chatbot, Voice, Email & Outreach.</Text></HStack>
							<HStack><Icon as={iconCheck} fontWeight={"600"} fontSize="16px" color="#2977FF" /><Text fontSize="16px" color={"#524D4D"} fontWeight={"500"}><Text as={'span'} fontWeight={600}>No hidden limits:</Text> you only scale when your bot needs increase.</Text></HStack>
							<HStack><Icon as={iconCheck} fontWeight={"600"} fontSize="16px" color="#2977FF" /><Text fontSize="16px" color={"#524D4D"} fontWeight={"500"}>Bring your <Text as={'span'} fontWeight={600}>own API keys:</Text> Pay the lowest market rates without markups.</Text></HStack>
							<HStack><Icon as={iconCheck} fontWeight={"600"} fontSize="16px" color="#2977FF" /><Text fontSize="16px" color={"#524D4D"} fontWeight={"500"}><Text as={'span'} fontWeight={600}>One-time bonus credits</Text> can be used for lead scraping, etc. Credits never expire.</Text></HStack>
						</VStack>
					</Box>

				</Flex>
				<Flex display={animationDiv === true ? "block" : "none"} >
					<Box
						bg='#fff'
						p='24px 24px '
						shadow='md'
						width={1040}

						borderRadius='4px'
						m='20px auto'
						marginBottom="24px"
						border="2px solid #DEE2E6"
						boxShadow="none"
						textAlign="center"
					>
						<Box

							className={styles.animationImg}
						>
							<Lottie animationData={animationData} style={{ width: 130, height: 130 }} />
						</Box>
						{/* <Image src={animation} alt="Animated Gif" boxSize="200px" /> */}
						<Text as="p" fontSize="20px" fontWeight="600" color="#1A202C">Congratulations!</Text>
						<Text as="p" fontSize="16px" fontWeight="400" color="#6C757D">Your profile is complete.</Text>
						<Button
							backgroundColor="#2977FF"
							color={"white"}
							variant='solid'
							mt="24px"
							// isFullWidth
							// size='lg'
							fontSize="14px"
							className='btn-hover-pri'
							onClick={goToDashboard}
						>
							Go To Dashboard
						</Button>
					</Box>
				</Flex>
			</Box>
		</Flex>

	);
};


export default withRouter(SignUp);
