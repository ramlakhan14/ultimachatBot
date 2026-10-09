import * as React from "react";

import {
	Box,
	Flex,
	Button,
	FormControl,
	FormLabel,
	Input,
	Textarea,

	useDisclosure,
	FormHelperText,
	useToast,
} from "@chakra-ui/react";
import { updateTrainingData } from "../../services/knowledgebaseService";
import MDEditor from "@uiw/react-md-editor";
import { CurrentUser } from "../../services/appConfig";


export const AddTrainingDataForm = ({
	selectedTrainingData,
	knowledgeBaseId,
	onSubmit,
	chatbotType
}: any) => {

	const [answer, setAnswer] = React.useState<string>(selectedTrainingData.content || '');
	const [question, setQuestion] = React.useState<string>(selectedTrainingData.title || '');

	const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
	const toast = useToast();
	React.useEffect(() => {
		setAnswer(selectedTrainingData.content)
		setQuestion(selectedTrainingData.title)

	}, [selectedTrainingData])


	const handleAnswerChange = React.useCallback((value) => {
		setAnswer(value)
	}, [])
	const handleQuestionChange = React.useCallback((e) => {
		setQuestion(e.target.value)
	}, [])
	const handleSubmit = React.useCallback(async (e) => {
		const userRole = CurrentUser.get();
		if (userRole.role == "admin" && chatbotType !== "vakmangids") {
			toast({
				title: `You cannot change the specific settings of the admin's project.`,
				status: "error",
				isClosable: true,
			});
		} else {
			setIsSubmitting(true)
			const data = ({
				q: question,
				a: answer,
				_id: selectedTrainingData._id
			});
			try {
				const response: any = await updateTrainingData(knowledgeBaseId, data)
				setIsSubmitting(false)
				toast({
					title: response?.data?.message,
					status: "success",
					isClosable: true,
				});
				onSubmit(data);

			} catch (error: any) {
				setIsSubmitting(false)
				toast({
					title: error?.response?.data?.message || error?.message || 'Oops! Something went wrong',
					status: "error",
					isClosable: true,
				});

			}
		}
	}, [answer, knowledgeBaseId, onSubmit, question, selectedTrainingData._id])

	return (
		<Box>
			<FormControl>
				<FormLabel fontSize="16px" fontWeight={400} color="#212529">Title</FormLabel>
				<Input value={question}
					onChange={handleQuestionChange} placeholder='Question' />
			</FormControl>

			<FormControl mt={6}>
				<FormLabel fontSize="16px" fontWeight={400} color="#212529">Data</FormLabel>
				<Box data-color-mode="light">
					<MDEditor height={200} value={answer} preview="edit" onChange={handleAnswerChange} />
				</Box>
				<FormHelperText fontSize="smaller" color="#6C757D">
					One of the best option to add training data is using the question and answer format.
				</FormHelperText>
			</FormControl>
			<Flex mt="8" justifyContent="end">
				<Button onClick={handleSubmit} gap={2} fontWeight={500} colorScheme='blue' isLoading={isSubmitting}>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M8.79395 3.93391e-06C8.9252 -0.000370696 9.05551 0.0258975 9.17676 0.0761758C9.29797 0.126482 9.40756 0.200791 9.5 0.293949L11.707 2.5C11.8002 2.59246 11.8745 2.70298 11.9248 2.82422C11.9751 2.94547 12.0004 3.07578 12 3.20704V11C12 11.2652 11.8955 11.5205 11.708 11.708C11.5205 11.8955 11.2652 12 11 12H1C0.73496 11.9999 0.480391 11.8954 0.292969 11.708C0.105432 11.5205 0 11.2652 0 11V1C0.000128023 0.734962 0.105546 0.480395 0.292969 0.292973C0.480391 0.10555 0.734958 0.000131925 1 3.93391e-06H8.79395ZM1 1V11H2.5V7.5C2.50013 7.23496 2.60555 6.98039 2.79297 6.79297C2.98039 6.60555 3.23496 6.50013 3.5 6.5H8.5C8.76522 6.5 9.02047 6.60544 9.20801 6.79297C9.39543 6.98039 9.49987 7.23496 9.5 7.5V11H11V3.20704L8.79395 1H1ZM3.5 7.5V11H8.5V7.5H3.5ZM7.5 2C7.63261 2 7.76072 2.05272 7.85449 2.14649C7.94814 2.24014 7.99987 2.36757 8 2.5C8 2.63261 7.94826 2.76073 7.85449 2.8545C7.76072 2.94826 7.63261 3 7.5 3H4C3.86757 2.99988 3.74014 2.94815 3.64648 2.8545C3.55272 2.76073 3.5 2.63261 3.5 2.5C3.50013 2.36757 3.55283 2.24014 3.64648 2.14649C3.74014 2.05283 3.86757 2.00013 4 2H7.5Z" fill="white" />
					</svg>

					Save
				</Button>
			</Flex>
		</Box>
	);
};
