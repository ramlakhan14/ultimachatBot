import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  useToast,
  Box
} from '@chakra-ui/react'
import { Field, Form, Formik } from 'formik';
import { forgotPassword } from '../../services/authServices';

interface ForgotPasswordProps {
  isOpen: boolean;
  // onOpen: () => void;
  onClose: () => void;
}

export function validateEmailAddress(email: string) {
  return email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}
function validateEmail(value: string) {
  let error;
  if (!value) {
    error = 'Please enter your email.';
  } else if (validateEmailAddress(value)) {
    error = 'Please enter a valid email address.';
  }
  return error;
}

function ForgotPassword({ isOpen, onClose }: ForgotPasswordProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [needToValidate, setneedToValidate] = useState(false);
  const toast = useToast();
  const lastToastRef = React.useRef<{ title: string; status?: string; time: number } | null>(null);

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

      if (
        lastToastRef.current &&
        lastToastRef.current.title === titleString &&
        lastToastRef.current.status === options.status &&
        now - lastToastRef.current.time < 2500
      ) {
        return;
      }

      lastToastRef.current = { title: titleString, status: options.status, time: now };
      toast.closeAll();

      const toastId =
        options.id ||
        `toast-${options.status || 'info'}-${titleString.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}`;

      if (!toast.isActive(toastId)) {
        toast({
          id: toastId,
          duration: 4000,
          isClosable: true,
          ...options,
          title: titleString,
        });
      }
    },
    [toast]
  );

  const submit = async (values: any, actions: any) => {
    try {
      setRegEmail(values.email);
      const response = await forgotPassword(values);
      showLimitedToast({
        title: response?.data?.message || 'Password reset link sent to your email.',
        status: 'success',
        isClosable: true,
      });
      setIsSubmitted(true);
    } catch (error: any) {
      showLimitedToast({
        title: error?.response?.data?.message || error?.message || 'Failed to send reset link.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      actions.setSubmitting(false);
    }
  }


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign={'center'}>Forgot Password?</ModalHeader>
          {/* <ModalCloseButton /> */}
          {!isSubmitted ? (<ModalBody textAlign={'center'}>
            <Text>Please enter your registered email address. <br />We will send you an email to reset your password.</Text>

            <Formik
              initialValues={{ email: '' }}
              validateOnChange={false}
              validateOnBlur={false}
              onSubmit={submit}
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
                        isInvalid={
                          form.errors.email &&
                          form.touched.email
                        }
                        mb='26px'
                      >

                        <Input
                          {...field}
                          id='email'
                          mt={'30px'}
                          placeholder='company@mail.com'
                        />
                        <FormErrorMessage>
                          {form.errors.email}
                        </FormErrorMessage>
                      </FormControl>
                    )}
                  </Field>
                  <ModalFooter justifyContent={'center'}>
                    <Button onClick={() => {
                      onClose();
                      props.resetForm();
                    }} type='button' as="button" backgroundColor="#efefef" mr={3} >
                      Cancel
                    </Button>
                    <Button
                      backgroundColor="#2977FF"
                      color="#fff"
                      className='btn-hover-pri'
                      type='submit'
                      isLoading={props.isSubmitting}
                    >
                      Send Reset Link
                    </Button>
                  </ModalFooter>
                </Form>
              )}
            </Formik>
          </ModalBody>)
            :
            (<ModalBody padding={'20px'} textAlign={'center'}>
              <Text fontWeight={500} fontSize={'20px'}>We are happy to help you reset your password!</Text>
              <Text mt={'20px'}>If you're using email and password for login, we sent the password reset email to <br /><Text display={'inline'} fontWeight={600} color='#2977FF'>{regEmail}</Text></Text>
              <Button mt={'20px'} colorScheme='blue' onClick={() => { onClose(); setIsSubmitted(false) }}>Go to Login</Button>
            </ModalBody>)}
        </ModalContent>
      </Modal>
    </>
  )
}

export default ForgotPassword;