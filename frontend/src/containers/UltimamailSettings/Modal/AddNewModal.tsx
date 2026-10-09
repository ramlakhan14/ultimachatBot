import * as React from "react";
import {
  Input,
  useToast,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  FormControl,
  FormLabel,
  ModalFooter,
  FormErrorMessage,
  Spinner,
  Text,

} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { createEmailSenderSignature } from "../../../services/ultimamailsettings";
import CryptoJS from 'crypto-js'; // Import crypto-js for encryption

type FormValues = {
  email: string;
  postmarkEmailAppPassword: string;
};


export const AddNewModal = ({ isOpen, onClose, accountAuthToken, fetchData }: { isOpen: boolean; onClose: () => void; fetchData: () => void, accountAuthToken: any }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>();

  const decryptPasskey = (encryptedPasskey: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPasskey, 'your-encryption-key');
    const decryptedPasskey = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedPasskey;
  };

  const onSubmit = async (formData: any) => {
    const secureEmailServerData = {
      ...formData,
      // authKey: decryptPasskey(accountAuthToken?.emailAccountAuthKey),
      authKey: accountAuthToken?.emailAccountAuthKey,
    };


    try {
      setIsLoading(true);
      const response = await createEmailSenderSignature(secureEmailServerData);

      // console.log("response", response);

      if (response.status === 200 || response?.status == 201) {
        fetchData();
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        reset();
        onClose();
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    } finally {
      setIsLoading(false);
    }
  }
  const onCancel = () => {
    reset();
    onClose();
  }

  return (

    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* <ModalHeader>Add Email Id</ModalHeader> */}
          <ModalBody mt="24px">
            <FormControl mb="8px" isInvalid={!!errors.email}>
              <FormLabel>Admin Email ID</FormLabel>
              <Input
                placeholder="Enter Admin Email ID"
                {...register("email", {
                  required: "Auth Key is required",
                  pattern: {
                    value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              {errors.email && <FormErrorMessage>{errors.email.message}</FormErrorMessage>}
            </FormControl>

            <FormControl mb="8px" isInvalid={!!errors.postmarkEmailAppPassword}>
              <FormLabel>App Password</FormLabel>
              <Input
                placeholder="Enter app password"
                {...register("postmarkEmailAppPassword", {
                  required: "App password is required"
                })}
              />
              {errors.postmarkEmailAppPassword && <FormErrorMessage>{errors.postmarkEmailAppPassword.message}</FormErrorMessage>}
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button fontWeight="500" colorScheme='blue' mr={3} type="submit">

              {isLoading ?
                <Spinner color='gray.700' />
                :
                <>
                  {/* <Image src={saveIcon} alt='Save & Continue' /> */}
                  <Text as="span" fontSize="16px" ms="8px">Save</Text>
                </>
              }
            </Button>
            <Button fontWeight="500" onClick={onCancel}>Cancel</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
