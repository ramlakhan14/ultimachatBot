import React from "react";
import {
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Box,
  useToast
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { connectWebhook } from "../../../services/zapierservice";
const FetchWebhookModal = ({ isOpen, onClose, fetchHooks }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const toast = useToast();
  const onSubmit = async (data: any) => {
    // console.log(data);
    try {
      setIsSubmitting(true);
      const res: any = await connectWebhook(data);
      // console.log(res)
      if (res.status === 200) {
        toast({
          title: res.data.message,
          status: "success",
          isClosable: true,
        });
        fetchHooks('', 1, 10);
        reset();
        onClose();

      }
    } catch (error: any) {
      toast({
        title: `${error.response.data.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  const closeModal = () => {
    reset();
    onClose();
  }
  return (
    <Modal isOpen={isOpen} size="xl" onClose={onClose} scrollBehavior="inside" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent bg="#F7FAFC">
        <ModalCloseButton _focus={{ outline: "none" }} />
        <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">Connect Webhook</ModalHeader>
        <Text as="span" textAlign="center" fontSize="14px" fontWeight="400" color="#6C757D" pb="15px">Provide the CRM name and webhook URL to securely connect your integration.</Text>
        <ModalBody>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl mb="16px" isInvalid={!!errors.crmName}>
              <FormLabel>CRM Name <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
              <Input
                placeholder="Enter CRM name"
                {...register("crmName", {
                  required: "CRM Name is required",
                })}
              />
              {errors.crmName && <FormErrorMessage>{errors.crmName.message}</FormErrorMessage>}
            </FormControl>
            <FormControl mb="16px" isInvalid={!!errors.webhookUrl}>
              <FormLabel>Webhook URL <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
              <Input
                placeholder="Enter Webhook URL"
                {...register("webhookUrl", {
                  required: "Webhook URL is required",
                })}
              />
              {errors.webhookUrl && <FormErrorMessage>{errors.webhookUrl.message}</FormErrorMessage>}
            </FormControl>
            <Box textAlign="end" mb="24px">
              <Button
                colorScheme="gray"
                size='md'
                border="1px solid #edf2f8"
                mr="12px"
                fontWeight={500}
                fontSize="16px" sx={{
                  _focus: {
                    boxShadow: 'none',
                  }
                }}
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                className="btn-hover-pri"
                size="md"
                type="submit"
                fontWeight={500}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                loadingText="Submitting"
                sx={{
                  _focus: {
                    boxShadow: 'none',
                  }
                }}
              >
                Save
              </Button>
            </Box>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default FetchWebhookModal;