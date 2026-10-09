import * as React from "react";

import {
	Box,
	Flex,
	useToast,
	Button,
	FormControl,
	FormLabel,
	Input,
	Textarea,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalHeader,
	ModalOverlay,

	useDisclosure,
	FormHelperText,
	FormErrorMessage,
	HStack,
	Tooltip,
	PopoverArrow,
	PopoverContent,
	PopoverTrigger,
	Popover,
} from "@chakra-ui/react";
import { FiPlus } from 'react-icons/fi';
import { addTrainingData } from "../../services/knowledgebaseService";
import MDEditor from '@uiw/react-md-editor';
import style from "./AddTrainingData.module.scss"
import { CurrentUser } from "../../services/appConfig";
import { GoInfo } from "react-icons/go";

export const AddTrainingData = ({
	initialAnswer,
	initialQuestion,
	onSubmit,
	knowledgeBaseId,
	chatbotType
}: any) => {

	const { isOpen, onOpen, onClose } = useDisclosure()
	const toast = useToast();

	const initialRef = React.useRef(null)
	const finalRef = React.useRef(null)

	const [answer, setAnswer] = React.useState<string>('');
	const [question, setQuestion] = React.useState<string>('');
	const [titleOpen, setTitleOpen] = React.useState<boolean>(false);
	const [dataOpen, setDataOpen] = React.useState<boolean>(false);

	const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
	const [errors, setErrors] = React.useState<{ question?: string; answer?: string }>({});


	const handleAnswerChange = React.useCallback((value) => {
		setAnswer(value);
	}, [])
	const handleQuestionChange = React.useCallback((e) => {
		setQuestion(e.target.value)
	}, [])
	const handleSubmit = React.useCallback(async (e) => {
		const userRole = CurrentUser.get();
		// if (userRole.role == "admin" && chatbotType !== "vakmangids") {
		// 	toast({
		// 		title: `You cannot change the specific settings of the admin's project.`,
		// 		status: "error",
		// 		isClosable: true,
		// 	});

		// } else {
		let formErrors: any = {};
		if (!question.trim()) {
			formErrors.question = "Title is required";
		}
		if (!answer.trim()) {
			formErrors.answer = "Data is required";
		}

		setErrors(formErrors);

		// Stop submit if errors exist
		if (Object.keys(formErrors).length > 0) return;

		try {
			setIsSubmitting(true)
			const data = ({
				q: question,
				a: answer
			});
			const response: any = await addTrainingData(knowledgeBaseId, data)
			setAnswer('');
			setQuestion('');
			onSubmit(response.data);
			onClose()
		} catch (error: any) {
			const errorData = error?.response?.data?.message
			toast({
				title: error?.response?.data?.message || error?.message || 'Oops! Something went wrong',
				status: "error",
				isClosable: true,
			});
		} finally {
			setIsSubmitting(false)
		}
		// }
	}, [question, answer, knowledgeBaseId, onSubmit, onClose, toast])

	return (
		<Box>
			<Box>
				<Button leftIcon={<FiPlus />} onClick={onOpen} bg="#fff" color="#2977FF" fontWeight={500} border="1px solid #2977FF" className={style.addBtn} isDisabled={isOpen}>Add Data</Button>
			</Box>
			<Modal
				initialFocusRef={initialRef}
				finalFocusRef={finalRef}
				isOpen={isOpen}
				onClose={onClose}
				size="5xl"
				closeOnOverlayClick={false}
			>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader fontSize={'18px'} color={'#1A202C'}>Add New Training Data</ModalHeader>
					<ModalCloseButton />
					<ModalBody pb={6}>
						<FormControl isInvalid={!!errors.question}>


							<HStack spacing={2} mb="4px" align="center">
								<FormLabel m={0} fontSize={'14px'} color={'#212529'}>
									Title
								</FormLabel>
								<Popover isOpen={titleOpen} onClose={() => setTitleOpen(false)}>
									<PopoverTrigger>
										<Box
											cursor="pointer"
											as="span"
											onClick={() => setTitleOpen(!titleOpen)}
										>
											<GoInfo color="#6C757D" />
										</Box>
									</PopoverTrigger>
									<PopoverContent
										bg="#efefef"
										fontWeight={500}
										color="#333"
										p={3}
										width="250px"
										fontSize="12px"
										border="1px solid #ccc"
										lineHeight="20px"
										style={{ boxShadow: 'none' }}
										borderRadius="4px"
									>
										<PopoverArrow bg="#efefef" transform="scale(1.5)" />
										{/* <PopoverCloseButton /> */}
										<Box whiteSpace="pre-wrap">Write a simple heading that describes your question.
										</Box>
									</PopoverContent>
								</Popover>
							</HStack>
							<Input ref={initialRef} value={question}
								onChange={handleQuestionChange} placeholder='Question' />
							{errors.question && <FormErrorMessage>{errors.question}</FormErrorMessage>}

						</FormControl>

						<FormControl mt={6} isInvalid={!!errors.answer}>
							{/* <FormLabel  color="#212529">Data</FormLabel> */}
							<HStack spacing={2} mb="4px" align="center">
								<FormLabel m={0} fontSize={'14px'} color={'#212529'}>
									Data
								</FormLabel>

								<Popover isOpen={dataOpen} onClose={() => setDataOpen(false)}>
									<PopoverTrigger>
										<Box
											cursor="pointer"
											as="span"
											onClick={() => setDataOpen(!dataOpen)}
										>
											<GoInfo color="#6C757D" />
										</Box>
									</PopoverTrigger>
									<PopoverContent
										bg="#efefef"
										fontWeight={500}
										color="#333"
										p={3}
										width="250px"
										fontSize="12px"
										border="1px solid #ccc"
										lineHeight="20px"
										style={{ boxShadow: 'none' }}
										borderRadius="4px"
									>
										<PopoverArrow bg="#efefef" transform="scale(1.5)" />
										{/* <PopoverCloseButton /> */}
										<Box whiteSpace="pre-wrap">Provide as much detail as possible about what you’re facing.
										</Box>
									</PopoverContent>
								</Popover>
							</HStack>
							<Box data-color-mode="light">
								<MDEditor height={200} value={answer} preview="edit" onChange={handleAnswerChange} />
							</Box>
							<FormHelperText fontSize="smaller" color="#6C757D">
								One of the best option to add training data is using the question and answer format.
							</FormHelperText>
							{errors.answer && <FormErrorMessage>{errors.answer}</FormErrorMessage>}
						</FormControl>
						<Flex mt="6" justifyContent="end">
							<Button onClick={onClose} mr={3} fontWeight={500}>Cancel</Button>
							<Button onClick={handleSubmit} fontWeight={500} colorScheme='blue' isLoading={isSubmitting}>
								Save
							</Button>
						</Flex>
					</ModalBody>
				</ModalContent>
			</Modal>
		</Box>
	);
};
